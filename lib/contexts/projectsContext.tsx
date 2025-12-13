'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { demoProjects, DemoProject, DemoUpload } from '@/lib/demoData';

interface ProjectsContextType {
  projects: DemoProject[];
  addProject: (project: Omit<DemoProject, 'id' | 'createdAt'>) => Promise<DemoProject | null>;
  updateProject: (id: string, updates: Partial<DemoProject>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => DemoProject | undefined;
  isLoading: boolean;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

const PROJECTS_KEY = 'dc:projects';

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user, isDemo } = useAuth();
  const [projects, setProjects] = useState<DemoProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load projects when auth changes
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    if (isDemo) {
      // Demo mode - use demo projects
      setProjects(demoProjects);
      setIsLoading(false);
    } else {
      // Real user - load from Supabase and map to UI shape
      async function fetchProjects() {
        setIsLoading(true);
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data, error } = await supabase
            .from('projects')
            .select('id, project_code, project_name, scope_of_work, address_full, areas, status, created_at, notes, project_folder_url')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (error) {
            console.error('Failed to fetch projects from Supabase:', error);
            setProjects([]);
          } else {
            const mapped: DemoProject[] = (data || []).map((row: any) => ({
              id: String(row.id ?? row.project_code ?? (String(row.project_name || 'P') + '-' + String(row.created_at || Date.now()))),
              project_code: row.project_code,
              name: row.project_name,
              scope: row.scope_of_work,
              address: row.address_full || undefined,
              notes: row.notes || undefined,
              areas: Array.isArray(row.areas) ? row.areas : undefined,
              area: Array.isArray(row.areas) && row.areas.length ? row.areas[0] : undefined,
              status: row.status || 'wip',
              uploads: [],
              createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
              project_folder_url: row.project_folder_url || undefined,
            }));
            setProjects(mapped);
          }
        } catch (err) {
          console.error('Error loading projects from Supabase:', err);
          setProjects([]);
        }
        setIsLoading(false);
      }
      fetchProjects();
    }
  }, [user, isDemo]);

  const saveProjects = (newProjects: DemoProject[]) => {
    if (!user || isDemo) return;
    
    const userProjectsKey = `${PROJECTS_KEY}:${user.id}`;
    localStorage.setItem(userProjectsKey, JSON.stringify(newProjects));
  };

  const addProject = async (projectData: Omit<DemoProject, 'id' | 'createdAt'>): Promise<DemoProject | null> => {
    if (!user) return null;
    if (isDemo) {
      // Demo mode: add locally
      const newProject: DemoProject = {
        ...projectData,
        id: `demo_${Date.now()}`,
        createdAt: Date.now(),
      };
      const updatedProjects = [newProject, ...projects];
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      return newProject;
    }
    // Real user: call API
    try {
      const { supabase } = await import('@/lib/supabase');
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          project_name: projectData.name,
          scope_of_work: projectData.scope,
          address_full: projectData.address,
          pincode: projectData.pincode,
          notes: projectData.notes,
          areas: projectData.areas,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Failed to create project:', err);
        return null;
      }
      const { project } = await res.json();
      if (project) {
        // After creation, refresh from Supabase to keep list consistent
        try {
          const { data, error } = await (await import('@/lib/supabase')).supabase
            .from('projects')
            .select('id, project_code, project_name, scope_of_work, address_full, pincode, areas, status, created_at, notes')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (!error) {
            const mapped: DemoProject[] = (data || []).map((row: any) => ({
              id: String(row.id ?? row.project_code),
              project_code: row.project_code,
              name: row.project_name,
              scope: row.scope_of_work,
              address: row.address_full || undefined,
              notes: row.notes || undefined,
              areas: Array.isArray(row.areas) ? row.areas : undefined,
              area: Array.isArray(row.areas) && row.areas.length ? row.areas[0] : undefined,
              status: row.status || 'wip',
              uploads: [],
              createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            }));
            setProjects(mapped);
            saveProjects(mapped);
          }
        } catch (e) {
          console.warn('Project created, but failed to refresh list:', e);
        }
        // Return a mapped project based on the response
        return {
          name: project.project_name,
          project_code: project.project_code,
          scope: project.scope_of_work,
          address: project.address_full || undefined,
          notes: project.notes || undefined,
          areas: Array.isArray(project.areas) ? project.areas : undefined,
          area: Array.isArray(project.areas) && project.areas.length ? project.areas[0] : undefined,
          status: project.status || 'wip',
          uploads: [],
          id: project.id || project.project_code || `p_${Date.now()}`,
          createdAt: project.created_at ? new Date(project.created_at).getTime() : Date.now(),
        };
      }
      return null;
    } catch (err) {
      console.error('Error creating project:', err);
      return null;
    }
  };

  const updateProject = (id: string, updates: Partial<DemoProject>) => {
    const updatedProjects = projects.map(project =>
      project.id === id ? { ...project, ...updates } : project
    );
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
  };

  const deleteProject = (id: string) => {
    console.log('[deleteProject] Deleting project with id:', id);
    console.log('[deleteProject] Projects before delete:', projects);
    const updatedProjects = projects.filter(project => project.id !== id);
    console.log('[deleteProject] Projects after delete:', updatedProjects);
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
  };

  const getProject = (id: string): DemoProject | undefined => {
    return projects.find(project => project.id === id);
  };

  const value: ProjectsContextType = {
    projects,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    isLoading,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
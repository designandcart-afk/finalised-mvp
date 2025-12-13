export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          project_name: string
          location: string | null
          area: string | null
          bhk: string | null
          project_folder_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_name: string
          location?: string | null
          area?: string | null
          bhk?: string | null
          project_folder_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_name?: string
          location?: string | null
          area?: string | null
          bhk?: string | null
          project_folder_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_user_files: {
        Row: {
          id: string
          project_id: string
          user_id: string
          file_name: string
          file_url: string
          file_type: string
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          file_name: string
          file_url: string
          file_type: string
          file_size?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          file_name?: string
          file_url?: string
          file_type?: string
          file_size?: number | null
          created_at?: string
        }
      }
      project_final_files: {
        Row: {
          id: string
          project_id: string
          file_name: string
          file_url: string
          file_type: string
          file_size: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_name: string
          file_url: string
          file_type: string
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_name?: string
          file_url?: string
          file_type?: string
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      project_quotes_bills: {
        Row: {
          id: string
          project_id: string
          file_name: string
          file_url: string
          file_size: number | null
          document_type: 'quote' | 'bill'
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_name: string
          file_url: string
          file_size?: number | null
          document_type: 'quote' | 'bill'
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_name?: string
          file_url?: string
          file_size?: number | null
          document_type?: 'quote' | 'bill'
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          project_id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          project_id: string
          meeting_date: string
          meeting_time: string | null
          location: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          meeting_date: string
          meeting_time?: string | null
          location?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          meeting_date?: string
          meeting_time?: string | null
          location?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      project_design_estimates: {
        Row: {
          id: string
          project_id: string
          estimate_type: 'rough' | 'initial' | 'final'
          estimate_number: string
          scope: string
          areas_count: number
          areas_list: string[] | null
          iterations_count: number
          options_count: number
          base_amount: number
          per_area_amount: number | null
          per_iteration_amount: number | null
          per_option_amount: number | null
          extra_charges: number | null
          extra_charges_description: string | null
          subtotal: number
          gst_percentage: number | null
          gst_amount: number
          total_amount: number
          status: 'active' | 'superseded' | null
          notes: string | null
          line_items: any[] | null
          discount_percentage: number | null
          discount_amount: number | null
          final_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          estimate_type: 'rough' | 'initial' | 'final'
          estimate_number: string
          scope: string
          areas_count?: number
          areas_list?: string[] | null
          iterations_count?: number
          options_count?: number
          base_amount?: number
          per_area_amount?: number | null
          per_iteration_amount?: number | null
          per_option_amount?: number | null
          extra_charges?: number | null
          extra_charges_description?: string | null
          subtotal?: number
          gst_percentage?: number | null
          gst_amount?: number
          total_amount?: number
          status?: 'active' | 'superseded' | null
          notes?: string | null
          line_items?: any[] | null
          discount_percentage?: number | null
          discount_amount?: number | null
          final_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          estimate_type?: 'rough' | 'initial' | 'final'
          estimate_number?: string
          scope?: string
          areas_count?: number
          areas_list?: string[] | null
          iterations_count?: number
          options_count?: number
          base_amount?: number
          per_area_amount?: number | null
          per_iteration_amount?: number | null
          per_option_amount?: number | null
          extra_charges?: number | null
          extra_charges_description?: string | null
          subtotal?: number
          gst_percentage?: number | null
          gst_amount?: number
          total_amount?: number
          status?: 'active' | 'superseded' | null
          notes?: string | null
          line_items?: any[] | null
          discount_percentage?: number | null
          discount_amount?: number | null
          final_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      project_design_payments: {
        Row: {
          id: string
          project_id: string
          estimate_id: string | null
          user_id: string
          payment_type: 'advance' | 'balance' | 'full'
          amount: number
          currency: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: 'pending' | 'paid' | 'failed' | 'refunded' | null
          invoice_number: string | null
          invoice_date: string | null
          invoice_pdf_url: string | null
          created_at: string
          paid_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          project_id: string
          estimate_id?: string | null
          user_id: string
          payment_type: 'advance' | 'balance' | 'full'
          amount: number
          currency?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded' | null
          invoice_number?: string | null
          invoice_date?: string | null
          invoice_pdf_url?: string | null
          created_at?: string
          paid_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          estimate_id?: string | null
          user_id?: string
          payment_type?: 'advance' | 'balance' | 'full'
          amount?: number
          currency?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: 'pending' | 'paid' | 'failed' | 'refunded' | null
          invoice_number?: string | null
          invoice_date?: string | null
          invoice_pdf_url?: string | null
          created_at?: string
          paid_at?: string | null
          notes?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

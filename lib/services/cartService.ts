import { supabase } from '@/lib/supabase';

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  project_id: string | null;
  area: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type CartItemWithProduct = CartItem & {
  product?: {
    id: string;
    title: string;
    price: number;
    image_url: string;
  };
};

/**
 * Cart Service - Manages cart items in Supabase
 */
export const cartService = {
  /**
   * Get all cart items for the current user
   */
  async getCartItems(): Promise<CartItemWithProduct[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user found');
        return [];
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products (
            id,
            title,
            price,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cart items:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getCartItems:', err);
      return [];
    }
  },

  /**
   * Add item to cart or update quantity if it exists
   */
  async addToCart(
    productId: string,
    quantity: number,
    projectId?: string,
    area?: string,
    productData?: { title: string; price: number; imageUrl: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if item already exists in cart
      const { data: existingItems } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('project_id', projectId || null)
        .eq('area', area || null)
        .maybeSingle();

      if (existingItems) {
        // Update quantity
        const { error } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItems.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItems.id);

        if (error) {
          console.error('Error updating cart item:', error);
          return { success: false, error: error.message };
        }
      } else {
        // Insert new item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity,
            project_id: projectId || null,
            area: area || null,
          });

        if (error) {
          console.error('Error adding to cart:', error);
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Exception in addToCart:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Update cart item quantity
   */
  async updateQuantity(
    cartItemId: string,
    quantity: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (quantity < 1) {
        return await this.removeFromCart(cartItemId);
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', cartItemId);

      if (error) {
        console.error('Error updating quantity:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Exception in updateQuantity:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Remove item from cart
   */
  async removeFromCart(cartItemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) {
        console.error('Error removing from cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Exception in removeFromCart:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Remove specific item from cart by product, project, and area
   */
  async removeByProductAndProject(
    productId: string,
    projectId?: string,
    area?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('project_id', projectId || null)
        .eq('area', area || null);

      if (error) {
        console.error('Error removing from cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Exception in removeByProductAndProject:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Clear all cart items for current user
   */
  async clearCart(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Exception in clearCart:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Clear specific cart items by IDs (used after order placement)
   */
  async clearCartItems(cartItemIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .in('id', cartItemIds)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing cart items:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Exception in clearCartItems:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get cart item count for a specific product in a project/area
   */
  async getCartQuantity(
    productId: string,
    projectId?: string,
    area?: string
  ): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return 0;

      const { data } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('project_id', projectId || null)
        .eq('area', area || null)
        .maybeSingle();

      return data?.quantity || 0;
    } catch (err) {
      console.error('Exception in getCartQuantity:', err);
      return 0;
    }
  },

  /**
   * Check if product is in cart
   */
  async isInCart(
    productId: string,
    projectId?: string,
    area?: string
  ): Promise<boolean> {
    const qty = await this.getCartQuantity(productId, projectId, area);
    return qty > 0;
  },
};

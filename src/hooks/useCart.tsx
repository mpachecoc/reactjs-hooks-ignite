import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Check Stock
      const cartProduct = cart.find(product => product.id === productId);

      const cartProductAmount = cartProduct ? cartProduct.amount : 0;

      const { data: stockProduct } = await api.get<Stock>(`stock/${productId}`)

      if (cartProductAmount + 1 > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      // Add to Cart
      const { data: dbProduct } = await api.get(`products/${productId}`)

      const productInCartIndex = cart.findIndex(product => product.id === productId);

      if (productInCartIndex !== -1) {
        const updatedCart = cart.map(product => product.id === productId ? {
          ...product,
          amount: product.amount + 1,
        } : product)
        
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      } else {
        const newProduct = {
          ...dbProduct,
          amount: 1,
        }

        const updatedCart = [...cart, newProduct];

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartProduct = cart.find(product => product.id === productId);

      if (!cartProduct) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = cart.filter(product => product.id !== productId);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      // Check Stock
      const { data: stockProduct } = await api.get<Stock>(`stock/${productId}`)

      const cartProduct = cart.find(product => product.id === productId);

      if (!cartProduct) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // Update Cart
      const updatedCart = cart.map(product => product.id === productId ? {
        ...product,
        amount: amount > product.amount ? product.amount + 1 : product.amount - 1,
      } : product)
      
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

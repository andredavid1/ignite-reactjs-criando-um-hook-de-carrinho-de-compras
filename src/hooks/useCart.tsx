import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { Toast } from 'react-toastify/dist/components';
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
      const productResponse = await api.get<Product>(`products/${productId}`);
      const productToAdd = productResponse.data;
      const stockResponse = await api.get<Stock>(`stock/${productId}`);
      const stockProduct = stockResponse.data      

      let index = cart.findIndex(product => product.id === productId);
      let newCart = cart;

      if(index >= 0){
        newCart[index].amount += 1;        
      } else {
        const newProduct= { ...productToAdd, amount: 1 };
        newCart = [...cart, newProduct];
        index = newCart.findIndex(product => product.id === productId)
      }
      
      if(stockProduct.amount < newCart[index].amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (err) {
      if(err.message === 'Quantidade solicitada fora de estoque'){
        toast.error(err.message)
      }

      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);
      
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        throw new Error('Erro na alteração de quantidade do produto')
      }

      const response = await api.get(`stock/${productId}`);
      const stockProduct = response.data;
      
      if(stockProduct.amount < amount){
        throw new Error('Quantidade solicitada fora de estoque');
      }

      let newCart = cart;
      const index = newCart.findIndex(product => product.id === productId);

      newCart[index].amount = amount;

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (err) {
      if(err.message === 'Quantidade solicitada fora de estoque'){
        toast.error(err.message)
      }

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

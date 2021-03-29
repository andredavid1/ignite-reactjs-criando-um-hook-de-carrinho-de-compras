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
      const productAlreadyexist = cart.find(product => product.id === productId);
      const {data: stockProduct} = await api.get<Stock>(`stock/${productId}`);
      
      if(!productAlreadyexist) {
        const {data: productToAdd} = await api.get(`products/${productId}`);
        const productIsAvailable = stockProduct.amount > 0

        if(!productIsAvailable) {
          throw new Error('Quantidade solicitada fora de estoque')
        }
        
        const newCart= [ ...cart, { ...productToAdd, amount: 1 } ];

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        const { amount: productAmount} = productAlreadyexist;
        const productIsAvailable = stockProduct.amount > productAmount;

        if(!productIsAvailable){
          throw new Error('Quantidade solicitada fora de estoque')
        }

        const cartUpdated = cart.map(product => {
          return product.id === productId
            ? {...product, amount: productAmount + 1}
            : product
        })

        setCart(cartUpdated);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
      }
    } catch (err) {
      if(err.message === 'Quantidade solicitada fora de estoque'){
        toast.error(err.message)
      }

      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(cart.filter(product => product.id === productId).length === 0){
        throw new Error('Erro na remoção do producto');
      }

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
        throw new Error('Quantidade solicitada fora de estoque')
      }

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if(stock.amount < amount || stock.amount === 0){
        throw new Error('Quantidade solicitada fora de estoque');
      }

      const newCart = cart.map(product => {
        return product.id === productId ? { ...product, amount } : product;
      });

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

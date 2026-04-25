import { useEffect, useRef } from 'react';
import { db, query, collection, where, onSnapshot } from '../firebase';
import { User, Seller } from '../types';
import { showChatNotification } from '../utils/notifications';

export const useChatNotifications = (
  user: User | null, 
  userShop: Seller | null, 
  activeTab: string, 
  shopWorkspaceChatId: string | null, 
  activeChatSellerId: string | undefined, 
  profileSubView: string
) => {
  const initCompleteCustomer = useRef(false);
  const initCompleteShop = useRef(false);

  // Listener for user (customer) receiving messages from shops
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    
    // We only want to skip the VERY FIRST snapshot (which loads all existing chats)
    // We want to persist this reference across renders so we don't accidentally notify on re-renders,
    // hence using a ref for initCompleteCustomer.
    
    const unsub = onSnapshot(q, (snapshot) => {
      if (initCompleteCustomer.current) {
        snapshot.docChanges().forEach(change => {
           if (change.type === 'modified') {
             const data = change.doc.data();
             if (data.lastSender && data.lastSender !== user.uid) {
               const msgSellerId = change.doc.id.replace(user.uid, '').replace('_', '');
               
               // Check if user is actively looking at THIS chat right now
               const isActivelyChattingWithShop = activeTab === 'Profile' && profileSubView === 'messages' && activeChatSellerId === msgSellerId;
               
               if (document.hidden || !isActivelyChattingWithShop) {
                  showChatNotification("Do'kondan xabar", data.lastMessage || "Sizga yangi xabar keldi");
               }
             }
           }
        });
      } else {
         initCompleteCustomer.current = true;
      }
    });

    return () => unsub();
  }, [user, activeTab, activeChatSellerId, profileSubView]);

  // Listener for shop owner receiving messages from customers
  useEffect(() => {
    if (!userShop) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', userShop.id));
    
    const unsub = onSnapshot(q, (snapshot) => {
      if (initCompleteShop.current) {
        snapshot.docChanges().forEach(change => {
           if (change.type === 'modified') {
             const data = change.doc.data();
             if (data.lastSender && data.lastSender !== userShop.id) {
               // Check if shop owner is actively looking at THIS customer right now
               const isActivelyChattingWithCustomer = activeTab === 'ShopWorkspace' && shopWorkspaceChatId === change.doc.id;
               
               if (document.hidden || !isActivelyChattingWithCustomer) {
                  showChatNotification("Mijozingizdan xabar", data.lastMessage || "Do'koningizga xabar keldi!");
               }
             }
           }
        });
      } else {
         initCompleteShop.current = true;
      }
    });

    return () => unsub();
  }, [userShop, activeTab, shopWorkspaceChatId]);
};

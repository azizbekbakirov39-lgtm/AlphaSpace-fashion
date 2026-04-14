import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Plus, Search, Trash2, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, setDoc } from '../firebase';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || (process as any).env.GEMINI_API_KEY });

interface TelegramLink {
  id: string;
  url: string;
  productName?: string;
  price?: string;
  description?: string;
  imageUrl?: string;
  channelName?: string;
  status: 'pending' | 'processed' | 'error';
  createdAt: any;
}

export default function TelegramLinkManager() {
  const [links, setLinks] = useState<TelegramLink[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'telegram_links'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const linksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TelegramLink[];
      setLinks(linksData);
    });
    return () => unsubscribe();
  }, []);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.includes('t.me/')) {
      toast.error("Iltimos, to'g'ri Telegram havolasini kiriting");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Fetch HTML via proxy
      const htmlResponse = await fetch('/api/fetch-telegram-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl })
      });
      
      if (!htmlResponse.ok) throw new Error("HTML yuklashda xatolik");
      const { html } = await htmlResponse.json();

      // 2. Parse with Gemini on frontend
      const prompt = `Extract product information from this Telegram post HTML:
      ${html.substring(0, 15000)}
      
      Return ONLY a JSON object with these fields:
      {
        "productName": "string",
        "price": "string",
        "description": "string",
        "imageUrl": "string (find the media URL in the HTML, usually in og:image or similar)",
        "channelName": "string",
        "tags": ["string"]
      }
      If no product is found, return an empty object or best guess.`;

      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = result.text?.replace(/```json|```/g, "").trim() || "{}";
      const metadata = JSON.parse(text);
      
      // 3. Save to Firestore
      const linkId = `manual_${Date.now()}`;
      await setDoc(doc(db, 'telegram_links', linkId), {
        id: linkId,
        url: newUrl,
        ...metadata,
        status: metadata.productName ? 'processed' : 'pending',
        createdAt: serverTimestamp()
      });

      setNewUrl('');
      toast.success("Havola muvaffaqiyatli qo'shildi");
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Havolani qo'shishda xatolik yuz berdi");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'telegram_links', id));
      toast.success("Havola o'chirildi");
    } catch (error) {
      toast.error("O'chirishda xatolik");
    }
  };

  const filteredLinks = links.filter(link => 
    link.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Link2 className="text-blue-500" />
          Telegram Linklar Bazasi
        </h2>
        <p className="text-gray-500">Manual va avtomatik yuklangan havolalarni boshqarish</p>
      </div>

      {/* Add Link Form */}
      <form onSubmit={handleAddLink} className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Telegram post havolasini kiriting (t.me/...)"
            className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Link2 className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
        </div>
        <button
          type="submit"
          disabled={isProcessing || !newUrl}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {isProcessing ? <RefreshCw className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />}
          Qo'shish
        </button>
      </form>

      {/* Search and List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bazadan qidirish..."
              className="w-full p-2 pl-9 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          <AnimatePresence mode="popLayout">
            {filteredLinks.map((link) => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4"
              >
                {link.imageUrl ? (
                  <img src={link.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Link2 className="text-gray-300 w-8 h-8" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {link.productName || "Nomsiz mahsulot"}
                    </h3>
                    {link.status === 'processed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : link.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                    {link.description || "Tavsif mavjud emas"}
                  </p>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {link.price || "Kelishilgan narx"}
                    </span>
                    <span className="text-gray-400">
                      {link.channelName || "Telegram"}
                    </span>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-600 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Link
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredLinks.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <Link2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Havolalar topilmadi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

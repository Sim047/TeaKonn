import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateProductModal from '../components/CreateProductModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { MapPin, Package, DollarSign } from 'lucide-react';

interface MyProductsProps {
  token: string | null;
  onNavigate?: (view: string) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onUpdated?: () => void;
}

export default function MyProducts({ token, onNavigate, onToast, onUpdated }: MyProductsProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [openCreate, setOpenCreate] = useState<boolean>(false);
  const [me, setMe] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  async function refresh() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const meRes = await axios.get(`${API_URL}/users/me`, { headers });
      const user = meRes.data || null;
      setMe(user);
      if (user?._id) {
        const base = API_URL.replace(/\/api$/, '');
        const res = await axios.get(`${base}/api/marketplace/user/${user._id}`, { headers });
        setItems(res.data || []);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [token]);

  return (
    <div className="min-h-full bg-transparent">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Products</h2>
            <p className="text-sm text-gray-700 dark:text-gray-200">Manage items in your marketplace</p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center px-4 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => onNavigate && onNavigate('my-activities')}>Back</button>
            <button className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" onClick={() => setOpenCreate(true)}>Create Product</button>
          </div>
        </div>

        {error && <div className="rounded-xl border p-3 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300 mb-4">{error}</div>}

        {loading ? (
          <div className="text-sm text-gray-700 dark:text-gray-200">Loading...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border p-4 bg-white dark:bg-gray-900">
            <p className="text-sm text-gray-700 dark:text-gray-200">No products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((p) => (
              <div key={p._id} className="group rounded-2xl border p-4 shadow-sm hover:shadow-lg transition-all bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-indigo-400/50 hover:ring-2 hover:ring-indigo-300/40">
                <div className="h-1 w-full rounded-full bg-gradient-to-r from-violet-500/30 to-pink-500/30 mb-3 opacity-80 group-hover:opacity-100" />
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{p.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span>{p.location || 'Location TBA'}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>{p.status}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>{p.price !== undefined ? p.price : 'N/A'}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="inline-flex items-center px-3 py-2 rounded-md bg-indigo-600 text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" onClick={() => { setEditingProduct(p); setOpenCreate(true); }}>
                    <Package className="w-4 h-4 mr-2" /> Edit
                  </button>
                  <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => setSelectedProduct(p)}>
                    View
                  </button>
                  <button className="inline-flex items-center px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400" onClick={() => setConfirmDeleteProductId(p._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openCreate && (
        <CreateProductModal
          isOpen={openCreate}
          onClose={() => { setEditingProduct(null); setOpenCreate(false); }}
          token={token || ''}
          onProductCreated={() => { setEditingProduct(null); refresh(); onUpdated && onUpdated(); onToast && onToast(editingProduct ? 'Product updated.' : 'Product created.', 'success'); }}
          editProduct={editingProduct}
        />
      )}
      {/* View modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl w-full max-w-lg shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProduct.title}</h3>
              <button className="px-3 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setSelectedProduct(null)}>Close</button>
            </div>
            <div className="p-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <div>Location: {selectedProduct.location || 'N/A'}</div>
              <div>Status: {selectedProduct.status}</div>
              <div>Price: {selectedProduct.price !== undefined ? selectedProduct.price : 'N/A'}</div>
              {selectedProduct.description && <div className="mt-2 text-gray-700 dark:text-gray-200">{selectedProduct.description}</div>}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2 justify-end">
              <button className="px-3 py-2 rounded-md bg-indigo-600 text-white" onClick={() => { setEditingProduct(selectedProduct); setOpenCreate(true); }}>Edit</button>
              <button className="px-3 py-2 rounded-md bg-rose-600 text-white" onClick={() => { setConfirmDeleteProductId(selectedProduct._id); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!confirmDeleteProductId}
        title="Delete Product"
        message="Delete this product? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          if (!token || !confirmDeleteProductId) return;
          try {
            const API = API_URL.replace(/\/api$/, '');
            const headers = { Authorization: `Bearer ${token}` };
            await axios.delete(`${API}/api/marketplace/${confirmDeleteProductId}`, { headers });
            await refresh();
            onUpdated && onUpdated();
            onToast && onToast('Product deleted.', 'success');
          } catch (e: any) {
            onToast && onToast(e.response?.data?.error || 'Failed to delete product', 'error');
          } finally {
            setConfirmDeleteProductId(null);
          }
        }}
        onCancel={() => setConfirmDeleteProductId(null)}
      />
    </div>
  );
}

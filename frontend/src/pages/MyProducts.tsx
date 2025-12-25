import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateProductModal from '../components/CreateProductModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { MapPin, Package, DollarSign, Tag } from 'lucide-react';

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
  const [query, setQuery] = useState<string>('');

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

  const statusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (s === 'sold') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    if (s === 'reserved') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const categoryBadge = (category?: string) => {
    const c = (category || '').toLowerCase();
    const map: Record<string, string> = {
      'sports equipment': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'apparel & clothing': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
      'footwear': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
      'accessories': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      'supplements & nutrition': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
      'fitness tech & wearables': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      'training gear': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      'recovery & wellness': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      'team sports gear': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'individual sports gear': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'outdoor & adventure': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      'other': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };
    return map[c] || map['other'];
  };

  return (
    <div className="min-h-full bg-transparent">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Products</h2>
            <p className="text-sm text-gray-700 dark:text-gray-200">Manage items in your marketplace</p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by title, category, location"
              className="input w-56"
              aria-label="Search products"
            />
            <button className="inline-flex items-center px-4 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40" onClick={() => onNavigate && onNavigate('my-activities')}>Back</button>
            <button className="btn" onClick={() => setOpenCreate(true)}>Create Product</button>
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
            {items.filter((p) => {
              const q = query.toLowerCase();
              if (!q) return true;
              return (
                (p.title || '').toLowerCase().includes(q) ||
                (p.category || '').toLowerCase().includes(q) ||
                (p.location || '').toLowerCase().includes(q)
              );
            }).map((p) => (
              <div key={p._id} className="group themed-card rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all hover:ring-2 hover:ring-[var(--accent-cyan)]/40">
                <div className="relative mb-3">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="w-full h-32 rounded-md object-cover" />
                  ) : (
                    <div className="w-full h-32 rounded-md bg-gradient-to-r from-violet-500/20 to-pink-500/20" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-gradient-to-r from-violet-500/40 to-pink-500/40" />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{p.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-theme-secondary">
                      <MapPin className="w-4 h-4 text-[var(--accent-cyan)]" />
                      <span>{p.location || 'Location TBA'}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full ${categoryBadge(p.category)}`}>
                        <Tag className="w-3 h-3 mr-1" /> {p.category}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-theme-secondary">
                  <DollarSign className="w-4 h-4 text-[var(--accent-amber)]" />
                  <span>{p.price !== undefined ? `${p.currency || 'USD'} ${p.price}` : 'N/A'}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn inline-flex items-center px-3 py-2" onClick={() => { setEditingProduct(p); setOpenCreate(true); }}>
                    <Package className="w-4 h-4 mr-2" /> Edit
                  </button>
                  <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40" onClick={() => setSelectedProduct(p)}>
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

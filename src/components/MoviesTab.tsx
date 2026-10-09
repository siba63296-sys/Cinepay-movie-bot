import React, { useState } from 'react';
import { Movie } from '../types';
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Film, Copy, Check, AlertCircle } from 'lucide-react';

interface MoviesTabProps {
  movies: Movie[];
  onRefreshData: () => void;
}

export const MoviesTab: React.FC<MoviesTabProps> = ({ movies, onRefreshData }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('49');
  const [description, setDescription] = useState('');
  const [fileId, setFileId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete modal state
  const [deletingMovie, setDeletingMovie] = useState<Movie | null>(null);

  const filteredMovies = movies.filter(m => {
    if (filter === 'active') return m.is_active;
    if (filter === 'inactive') return !m.is_active;
    return true;
  });

  const handleCopyFileId = (idText: string) => {
    navigator.clipboard.writeText(idText);
    setCopiedId(idText);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (movie: Movie) => {
    try {
      await fetch(`/api/movies/${movie.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !movie.is_active })
      });
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !fileId) {
      setErrorMsg('Title, Price, and Telegram File ID are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          price: parseFloat(price),
          description,
          telegram_file_id: fileId,
          is_active: true
        })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to add movie');
      } else {
        setShowAddModal(false);
        setTitle('');
        setPrice('49');
        setDescription('');
        setFileId('');
        onRefreshData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMovie) return;
    try {
      await fetch(`/api/movies/${deletingMovie.id}`, { method: 'DELETE' });
      setDeletingMovie(null);
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const generateSampleFileId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let rand = 'BAACAgUAAxkBAAIB';
    for (let i = 0; i < 30; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    setFileId(rand);
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Movie Catalog Management</h2>
          <p className="text-xs text-neutral-400">
            Stored in Supabase PostgreSQL · Video files stay hosted on Telegram servers
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                filter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({movies.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                filter === 'active' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Active ({movies.filter(m => m.is_active).length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                filter === 'inactive' ? 'bg-neutral-800 text-rose-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Inactive ({movies.filter(m => !m.is_active).length})
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ml-auto sm:ml-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Movie</span>
          </button>
        </div>
      </div>

      {/* Movies Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
              <tr>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Telegram File ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {filteredMovies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    No movies found matching current filter. Click "Add Movie" above.
                  </td>
                </tr>
              ) : (
                filteredMovies.map((movie) => (
                  <tr key={movie.id} className="hover:bg-neutral-900/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{movie.title}</div>
                      <div className="text-neutral-500 text-[11px] max-w-md truncate">
                        {movie.description || 'No description'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-amber-400 font-semibold text-sm">
                      ₹{movie.price}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <code className="text-[10px] text-neutral-400 font-mono truncate bg-neutral-950 px-2 py-1 rounded border border-neutral-800/80">
                          {movie.telegram_file_id}
                        </code>
                        <button
                          onClick={() => handleCopyFileId(movie.telegram_file_id)}
                          className="text-neutral-500 hover:text-white shrink-0"
                          title="Copy file_id"
                        >
                          {copiedId === movie.telegram_file_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(movie)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          movie.is_active
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/60'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/50 hover:bg-rose-900/60'
                        }`}
                      >
                        {movie.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setDeletingMovie(movie)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 rounded hover:bg-neutral-800 transition-colors"
                        title="Delete movie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-start gap-3">
        <Film className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-400 leading-relaxed">
          <strong className="text-white">Why store Telegram file_id instead of files in Supabase?</strong><br />
          Storing 2GB-4GB movie video files in Supabase Storage quickly exceeds free tier limits and costs bandwidth. 
          By keeping the movie in Telegram's cloud and storing only its lightweight <code className="text-amber-300">file_id</code> string in Supabase, 
          the bot can deliver videos to thousands of customers completely free with zero bandwidth costs!
        </div>
      </div>

      {/* Add Movie Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">Add New Movie to Catalog</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter movie title, price, and the Telegram video file_id.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddMovie} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Movie Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. KGF Chapter 2 (Hindi Dual Audio)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Price in INR (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Helper</label>
                  <button
                    type="button"
                    onClick={generateSampleFileId}
                    className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg border border-neutral-700 transition-colors"
                  >
                    Generate Sample File ID
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Telegram File ID</label>
                <input
                  type="text"
                  required
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                  placeholder="BAACAgUAAxkBAAIBv2eK3b..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Obtained when uploading a video directly to your bot or forwarding to @ShowJsonBot.
                </p>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="1080p Web-DL Hindi Audio, 2h 45m"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Saving...' : 'Add Movie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Delete Movie?</h3>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Are you sure you want to delete <b className="text-white">"{deletingMovie.title}"</b>? 
              Existing customer orders will be preserved in Supabase.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingMovie(null)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg"
              >
                Yes, Delete Movie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

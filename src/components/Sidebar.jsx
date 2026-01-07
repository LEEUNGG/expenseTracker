import { useState } from 'react';
import { Settings, Moon, Sun, X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

export function Sidebar({ isOpen, onClose, categories, onCategoryUpdate, onCategoryDelete, onCategoryCreate }) {
  const [showSettings, setShowSettings] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // 'edit' or 'new'
  const [editData, setEditData] = useState({ name: '', emoji: '', color: '#a78bfa' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', emoji: '', color: '#a78bfa' });

  const handleEdit = (category) => {
    setEditingCategory(category.id);
    setEditData({ name: category.name, emoji: category.emoji, color: category.color || '#3b82f6' });
  };

  const handleSave = async () => {
    await onCategoryUpdate(editingCategory, editData);
    setEditingCategory(null);
    setEditData({ name: '', emoji: '', color: '#3b82f6' });
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setEditData({ name: '', emoji: '', color: '#3b82f6' });
  };

  const handleCreate = async () => {
    await onCategoryCreate(newCategory);
    setShowAddForm(false);
    setNewCategory({ name: '', emoji: '', color: '#3b82f6' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? Expenses using this category will not be affected.')) {
      await onCategoryDelete(id);
    }
  };

  const emojis = ['🍜', '🚗', '🛍️', '🎮', '💊', '📚', '🏠', '📦', '💼', '✈️', '🎬', '🎵', '🏃', '🎨', '💻', '📱'];

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[20rem] sm:w-[24rem] bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
            </div>

            {showSettings && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium mb-3">Category Management</h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        {editingCategory === category.id ? (
                          <div className="flex-1 space-y-3 p-1">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowEmojiPicker(showEmojiPicker === 'edit' ? null : 'edit')}
                                  className="w-14 h-10 flex items-center justify-center text-xl border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-600 hover:border-blue-500 transition-colors"
                                >
                                  {editData.emoji}
                                </button>
                                {showEmojiPicker === 'edit' && (
                                  <div className="absolute top-full left-0 mt-2 z-50 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl grid grid-cols-4 gap-1 w-48">
                                    {emojis.map(emoji => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                          setEditData({ ...editData, emoji });
                                          setShowEmojiPicker(null);
                                        }}
                                        className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <input
                                type="text"
                                value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                                placeholder="Category Name"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Color:</span>
                                <input
                                  type="color"
                                  value={editData.color}
                                  onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                                  className="w-10 h-8 p-0.5 border border-gray-200 dark:border-gray-500 rounded-lg cursor-pointer bg-white dark:bg-gray-600"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSave}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-xs font-medium"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                              style={{ backgroundColor: category.color || '#3b82f6' }}
                            />
                            <span className="text-xl flex-shrink-0">{category.emoji}</span>
                            <span className="flex-1 truncate">{category.name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEdit(category)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(category.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {showAddForm ? (
                    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl space-y-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex gap-2">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(showEmojiPicker === 'new' ? null : 'new')}
                            className="w-16 h-11 flex items-center justify-center text-2xl border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-600 hover:border-blue-500 transition-colors"
                          >
                            {newCategory.emoji || '✨'}
                          </button>
                          {showEmojiPicker === 'new' && (
                            <div className="absolute top-full left-0 mt-2 z-50 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl grid grid-cols-4 gap-1 w-48">
                              {emojis.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    setNewCategory({ ...newCategory, emoji });
                                    setShowEmojiPicker(null);
                                  }}
                                  className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                          placeholder="Category Name"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Color:</span>
                          <input
                            type="color"
                            value={newCategory.color}
                            onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                            className="w-10 h-8 p-0 border border-gray-200 dark:border-gray-500 rounded cursor-pointer overflow-hidden"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowAddForm(false);
                              setNewCategory({ name: '', emoji: '', color: '#3b82f6' });
                            }}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Create
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Category
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={onClose}
        />
      )}
    </>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {theme === 'light' ? (
        <>
          <Moon className="w-5 h-5" />
          <span>Switch to Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="w-5 h-5" />
          <span>Switch to Light Mode</span>
        </>
      )}
    </button>
  );
}

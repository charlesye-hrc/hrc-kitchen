import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  Stack,
  FormGroup,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  ViewWeek as ViewWeekIcon,
  Category as CategoryIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import VariationGroupManager from './VariationGroupManager';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  weekdays: string[];
  imageUrl: string | null;
  dietaryTags: string[];
  isActive: boolean;
  customizations: Array<{
    id: string;
    name: string;
  }>;
}

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const CATEGORIES = ['MAIN', 'SIDE', 'DRINK', 'DESSERT', 'OTHER'];
const DIETARY_TAGS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal'];

const MenuManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentWeekday, setCurrentWeekday] = useState(0);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'weekday' | 'category' | 'all'>('weekday');
  const [selectedCategory, setSelectedCategory] = useState<string>('MAIN');
  const [dialogTab, setDialogTab] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'MAIN',
    weekdays: [] as string[],
    imageUrl: '',
    dietaryTags: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/menu/week');

      if (response.data.success) {
        setMenuItems(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      // Editing existing item
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        category: item.category,
        weekdays: item.weekdays,
        imageUrl: item.imageUrl || '',
        dietaryTags: item.dietaryTags,
        isActive: item.isActive,
      });
    } else {
      // Creating new item
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category: 'MAIN',
        weekdays: viewMode === 'weekday' ? [WEEKDAYS[currentWeekday]] : [],
        imageUrl: '',
        dietaryTags: [],
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
    setDialogTab(0);
  };

  const handleSaveItem = async () => {
    try {
      setError('');

      if (!formData.name || !formData.price) {
        setError('Name and price are required');
        return;
      }

      if (!formData.weekdays || formData.weekdays.length === 0) {
        setError('At least one weekday must be selected');
        return;
      }

      const itemData = {
        ...formData,
        price: parseFloat(formData.price),
      };

      if (editingItem) {
        // Update existing item
        await api.put(`/admin/menu/items/${editingItem.id}`, itemData);
      } else {
        // Create new item
        await api.post('/admin/menu/items', itemData);
      }

      handleCloseDialog();
      fetchMenuItems();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save menu item');
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      await api.delete(`/admin/menu/items/${itemToDelete.id}`);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchMenuItems();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete menu item');
    }
  };

  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      event.target.value = ''; // Reset input
      return;
    }

    try {
      setUploadingImage(true);
      setError('');

      // Compress image
      const compressedBase64 = await compressImage(file, 1200, 0.8);

      // Check compressed size (base64 is ~33% larger than binary)
      const sizeInBytes = (compressedBase64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      // If still too large after compression, try higher compression
      let finalBase64 = compressedBase64;
      if (sizeInMB > 5) {
        finalBase64 = await compressImage(file, 800, 0.6);
        const newSize = (finalBase64.length * 3) / 4 / (1024 * 1024);

        if (newSize > 5) {
          setError('Image is too large even after compression. Please use a smaller image.');
          event.target.value = '';
          setUploadingImage(false);
          return;
        }
      }

      // Upload to Cloudinary via backend
      const response = await api.post('/admin/upload/image', {
        imageData: finalBase64,
        folder: 'menu-items',
      });

      if (response.data.success) {
        setFormData({ ...formData, imageUrl: response.data.data.url });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      event.target.value = ''; // Reset input to allow re-upload
    }
  };

  const currentWeekdayName = WEEKDAYS[currentWeekday];

  // Get all items across all weekdays
  const getAllItems = (): MenuItem[] => {
    const allItems: MenuItem[] = [];
    WEEKDAYS.forEach(day => {
      if (menuItems[day]) {
        allItems.push(...menuItems[day]);
      }
    });
    return allItems;
  };

  // Filter items based on view mode and search query
  const getFilteredItems = () => {
    let items: MenuItem[] = [];

    // First, get items based on view mode
    if (viewMode === 'weekday') {
      items = menuItems[currentWeekdayName] || [];
    } else if (viewMode === 'category') {
      const allItems = getAllItems();
      items = allItems.filter(item => item.category === selectedCategory);
    } else {
      // 'all' view
      items = getAllItems();
    }

    // Then apply search filter if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.dietaryTags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return items;
  };

  const currentItems = getFilteredItems();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        sx={{
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 2, sm: 0 }
        }}
      >
        <Typography variant="h6">Menu Items</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Menu Item
        </Button>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search menu items by name, description, category, or dietary tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          size="small"
        />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode !== null) {
              setViewMode(newMode);
            }
          }}
          size="small"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Tooltip title="By Day">
            <ToggleButton value="weekday" sx={{ px: 2, flex: { xs: 1, sm: 'initial' } }}>
              <ViewWeekIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="By Category">
            <ToggleButton value="category" sx={{ px: 2, flex: { xs: 1, sm: 'initial' } }}>
              <CategoryIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="All Items">
            <ToggleButton value="all" sx={{ px: 2, flex: { xs: 1, sm: 'initial' } }}>
              <ViewListIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </Stack>

      {viewMode === 'weekday' && (
        <Tabs
          value={currentWeekday}
          onChange={(_, newValue) => setCurrentWeekday(newValue)}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          {WEEKDAYS.map((day, index) => (
            <Tab key={day} label={day} />
          ))}
        </Tabs>
      )}

      {viewMode === 'category' && (
        <Tabs
          value={selectedCategory}
          onChange={(_, newValue) => setSelectedCategory(newValue)}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          {CATEGORIES.map((category) => (
            <Tab key={category} label={category} value={category} />
          ))}
        </Tabs>
      )}

      {searchQuery && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Showing ${currentItems.length} result${currentItems.length !== 1 ? 's' : ''} for "${searchQuery}"`}
            onDelete={() => setSearchQuery('')}
            color="primary"
          />
        </Box>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {currentItems.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">
              {searchQuery
                ? `No menu items found matching "${searchQuery}"`
                : viewMode === 'weekday'
                ? `No menu items for ${currentWeekdayName}`
                : viewMode === 'category'
                ? `No ${selectedCategory} items`
                : 'No menu items'}
            </Alert>
          </Grid>
        ) : (
          currentItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {item.imageUrl && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={item.imageUrl}
                    alt={item.name}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
                  <Typography variant="h6" gutterBottom noWrap title={item.name}>
                    {item.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '40px',
                    }}
                  >
                    {item.description}
                  </Typography>
                  <Typography variant="h6" color="primary" gutterBottom>
                    ${Number(item.price).toFixed(2)}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                    {viewMode !== 'category' && (
                      <Chip label={item.category} size="small" color="primary" />
                    )}
                    {viewMode !== 'weekday' && item.weekdays.map((day) => (
                      <Chip key={day} label={day} size="small" color="secondary" />
                    ))}
                    {!item.isActive && (
                      <Chip label="Inactive" size="small" color="error" />
                    )}
                  </Box>
                  {item.dietaryTags.length > 0 && (
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {item.dietaryTags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-start', px: 2, pb: 2 }}>
                  <IconButton onClick={() => handleOpenDialog(item)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      setItemToDelete(item);
                      setDeleteDialogOpen(true);
                    }}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        </DialogTitle>
        <Tabs
          value={dialogTab}
          onChange={(_, newValue) => setDialogTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
        >
          <Tab label="Basic Info" />
          <Tab label="Variations" disabled={!editingItem} />
        </Tabs>
        <DialogContent>
          {dialogTab === 0 && (
            <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="Price"
              fullWidth
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              inputProps={{ step: '0.01', min: '0' }}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Weekdays *
              </Typography>
              <FormGroup sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                {WEEKDAYS.map((day) => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={formData.weekdays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              weekdays: [...formData.weekdays, day],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              weekdays: formData.weekdays.filter((d) => d !== day),
                            });
                          }
                        }}
                      />
                    }
                    label={day}
                    sx={{ mr: { xs: 0, sm: 2 } }}
                  />
                ))}
              </FormGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Dietary Tags
              </Typography>
              <FormGroup sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                {DIETARY_TAGS.map((tag) => (
                  <FormControlLabel
                    key={tag}
                    control={
                      <Checkbox
                        checked={formData.dietaryTags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              dietaryTags: [...formData.dietaryTags, tag],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              dietaryTags: formData.dietaryTags.filter((t) => t !== tag),
                            });
                          }
                        }}
                      />
                    }
                    label={tag}
                    sx={{ mr: { xs: 0, sm: 2 } }}
                  />
                ))}
              </FormGroup>
            </Box>

            <Box>
              {!formData.imageUrl && !uploadingImage && (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                >
                  Upload Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
              )}
              {uploadingImage && (
                <Box display="flex" alignItems="center" justifyContent="center" py={3}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Uploading image...
                  </Typography>
                </Box>
              )}
              {formData.imageUrl && !uploadingImage && (
                <Box>
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    Remove Image
                  </Button>
                </Box>
              )}
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              }
              label="Active"
            />
          </Stack>
          )}

          {dialogTab === 1 && editingItem && (
            <Box sx={{ mt: 2 }}>
              <VariationGroupManager
                menuItemId={editingItem.id}
                onUpdate={fetchMenuItems}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {dialogTab === 1 ? 'Done' : 'Cancel'}
          </Button>
          {dialogTab === 0 && (
            <Button onClick={handleSaveItem} variant="contained">
              {editingItem ? 'Update' : 'Create'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Menu Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate "{itemToDelete?.name}"? This item will no
            longer appear in the menu.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteItem} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MenuManagement;

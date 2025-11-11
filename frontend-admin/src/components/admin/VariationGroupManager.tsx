import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Chip,
  Stack,
  Alert,
  Divider,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import api, { VariationGroup, VariationOption, VariationGroupType } from '../../services/api';

interface VariationGroupManagerProps {
  menuItemId: string;
  onUpdate?: () => void;
}

const VariationGroupManager: React.FC<VariationGroupManagerProps> = ({ menuItemId, onUpdate }) => {
  const [groups, setGroups] = useState<VariationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group inline editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    type: 'SINGLE_SELECT' as VariationGroupType,
    required: false,
  });

  // Option inline editing state
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [addingOptionToGroup, setAddingOptionToGroup] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState({
    name: '',
    priceModifier: 0,
    isDefault: false,
  });

  useEffect(() => {
    fetchGroups();
  }, [menuItemId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/menu/items/${menuItemId}/variation-groups`);
      setGroups(response.data.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching variation groups:', err);
      setError(err.response?.data?.message || 'Failed to load variation groups');
    } finally {
      setLoading(false);
    }
  };

  // Group CRUD operations
  const handleStartAddGroup = () => {
    setAddingGroup(true);
    setEditingGroupId(null);
    setGroupForm({
      name: '',
      type: 'SINGLE_SELECT',
      required: false,
    });
  };

  const handleStartEditGroup = (group: VariationGroup) => {
    setEditingGroupId(group.id);
    setAddingGroup(false);
    setGroupForm({
      name: group.name,
      type: group.type,
      required: group.required,
    });
  };

  const handleCancelGroupEdit = () => {
    setEditingGroupId(null);
    setAddingGroup(false);
    setGroupForm({
      name: '',
      type: 'SINGLE_SELECT',
      required: false,
    });
  };

  const handleSaveGroup = async () => {
    try {
      if (!groupForm.name.trim()) {
        alert('Group name is required');
        return;
      }

      if (editingGroupId) {
        // Update existing group
        const response = await api.put(`/admin/variation-groups/${editingGroupId}`, groupForm);
        const updatedGroup = response.data.data;

        // Update local state
        setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
      } else {
        // Create new group
        const response = await api.post(`/admin/menu/items/${menuItemId}/variation-groups`, {
          ...groupForm,
          displayOrder: groups.length,
        });
        const newGroup = response.data.data;

        // Add to local state
        setGroups(prev => [...prev, newGroup]);
      }

      // Clear editing state
      handleCancelGroupEdit();
    } catch (err: any) {
      console.error('Error saving group:', err);
      alert(err.response?.data?.message || 'Failed to save variation group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this variation group? All options will be removed.')) return;

    try {
      await api.delete(`/admin/variation-groups/${groupId}`);

      // Update local state
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (err: any) {
      console.error('Error deleting group:', err);
      alert(err.response?.data?.message || 'Failed to delete variation group');
    }
  };

  // Option CRUD operations
  const handleStartAddOption = (groupId: string) => {
    setAddingOptionToGroup(groupId);
    setEditingOptionId(null);
    setOptionForm({
      name: '',
      priceModifier: 0,
      isDefault: false,
    });
  };

  const handleStartEditOption = (option: VariationOption) => {
    setEditingOptionId(option.id);
    setAddingOptionToGroup(null);
    setOptionForm({
      name: option.name,
      priceModifier: option.priceModifier,
      isDefault: option.isDefault,
    });
  };

  const handleCancelOptionEdit = () => {
    setEditingOptionId(null);
    setAddingOptionToGroup(null);
    setOptionForm({
      name: '',
      priceModifier: 0,
      isDefault: false,
    });
  };

  const handleSaveOption = async (groupId: string) => {
    try {
      if (!optionForm.name.trim()) {
        alert('Option name is required');
        return;
      }

      const group = groups.find(g => g.id === groupId);

      // If setting this option as default, clear other defaults first
      if (optionForm.isDefault) {
        const otherDefaults = group?.options.filter(
          opt => opt.isDefault && opt.id !== editingOptionId
        ) || [];

        // Clear other defaults
        for (const opt of otherDefaults) {
          await api.put(`/admin/variation-options/${opt.id}`, {
            name: opt.name,
            priceModifier: opt.priceModifier,
            isDefault: false,
          });
        }
      }

      if (editingOptionId) {
        // Update existing option
        const response = await api.put(`/admin/variation-options/${editingOptionId}`, optionForm);
        const updatedOption = response.data.data;

        // Update local state
        setGroups(groups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              options: g.options.map(opt => {
                if (opt.id === updatedOption.id) {
                  return updatedOption;
                }
                // Clear isDefault if we set another option as default
                if (optionForm.isDefault && opt.isDefault && opt.id !== updatedOption.id) {
                  return { ...opt, isDefault: false };
                }
                return opt;
              })
            };
          }
          return g;
        }));
      } else {
        // Create new option
        const response = await api.post(`/admin/variation-groups/${groupId}/options`, {
          ...optionForm,
          displayOrder: group?.options?.length || 0,
        });
        const newOption = response.data.data;

        // Update local state
        setGroups(groups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              options: [
                ...g.options.map(opt =>
                  // Clear isDefault if we set another option as default
                  optionForm.isDefault && opt.isDefault ? { ...opt, isDefault: false } : opt
                ),
                newOption
              ]
            };
          }
          return g;
        }));
      }

      // Clear editing state
      handleCancelOptionEdit();
    } catch (err: any) {
      console.error('Error saving option:', err);
      alert(err.response?.data?.message || 'Failed to save variation option');
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Delete this option?')) return;

    try {
      await api.delete(`/admin/variation-options/${optionId}`);

      // Update local state
      setGroups(groups.map(g => ({
        ...g,
        options: g.options.filter(opt => opt.id !== optionId)
      })));
    } catch (err: any) {
      console.error('Error deleting option:', err);
      alert(err.response?.data?.message || 'Failed to delete option');
    }
  };

  const formatPrice = (modifier: number | string): string => {
    const numModifier = Number(modifier);
    if (numModifier === 0) return 'Free';
    const sign = numModifier > 0 ? '+' : '';
    return `${sign}$${numModifier.toFixed(2)}`;
  };

  if (loading) {
    return <Typography>Loading variation groups...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Variation Groups</Typography>
        {!addingGroup && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleStartAddGroup}
            size="small"
          >
            Add Group
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        {/* Inline add group form */}
        {addingGroup && (
          <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  size="small"
                  label="Group Name"
                  placeholder="e.g., Size, Protein Choice, Add-ons"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  autoFocus
                  fullWidth
                />

                <FormControl component="fieldset">
                  <FormLabel>Selection Type</FormLabel>
                  <RadioGroup
                    row
                    value={groupForm.type}
                    onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value as VariationGroupType })}
                  >
                    <FormControlLabel
                      value="SINGLE_SELECT"
                      control={<Radio size="small" />}
                      label="Single Select"
                    />
                    <FormControlLabel
                      value="MULTI_SELECT"
                      control={<Radio size="small" />}
                      label="Multi Select"
                    />
                  </RadioGroup>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={groupForm.required}
                      onChange={(e) => setGroupForm({ ...groupForm, required: e.target.checked })}
                    />
                  }
                  label="Required"
                />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={handleCancelGroupEdit}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" onClick={handleSaveGroup}>
                    Add Group
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {groups.length === 0 && !addingGroup ? (
          <Alert severity="info">
            No variation groups yet. Click "Add Group" to create dimensions like Size, Protein Choice, etc.
          </Alert>
        ) : (
          groups.map((group) => (
            <Card key={group.id} variant="outlined" sx={editingGroupId === group.id ? { bgcolor: 'action.hover' } : {}}>
              <CardContent>
                {editingGroupId === group.id ? (
                  // Inline edit mode
                  <Stack spacing={2}>
                    <TextField
                      size="small"
                      label="Group Name"
                      placeholder="e.g., Size, Protein Choice, Add-ons"
                      value={groupForm.name}
                      onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                      autoFocus
                      fullWidth
                    />

                    <FormControl component="fieldset">
                      <FormLabel>Selection Type</FormLabel>
                      <RadioGroup
                        row
                        value={groupForm.type}
                        onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value as VariationGroupType })}
                      >
                        <FormControlLabel
                          value="SINGLE_SELECT"
                          control={<Radio size="small" />}
                          label="Single Select"
                        />
                        <FormControlLabel
                          value="MULTI_SELECT"
                          control={<Radio size="small" />}
                          label="Multi Select"
                        />
                      </RadioGroup>
                    </FormControl>

                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={groupForm.required}
                          onChange={(e) => setGroupForm({ ...groupForm, required: e.target.checked })}
                        />
                      }
                      label="Required"
                    />

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button size="small" onClick={handleCancelGroupEdit}>
                        Cancel
                      </Button>
                      <Button size="small" variant="contained" onClick={handleSaveGroup}>
                        Save
                      </Button>
                    </Box>
                  </Stack>
                ) : (
                  // Display mode
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DragIcon sx={{ color: 'text.secondary', mr: 1, cursor: 'grab' }} />
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {group.name}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={group.type === 'SINGLE_SELECT' ? 'Single Select' : 'Multi Select'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {group.required && (
                          <Chip label="Required" size="small" color="error" />
                        )}
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                    {group.options.map((option) => (
                      editingOptionId === option.id ? (
                        // Inline edit form
                        <Box
                          key={option.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                          }}
                        >
                          <TextField
                            size="small"
                            placeholder="Option name"
                            value={optionForm.name}
                            onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                            sx={{ flexGrow: 1, minWidth: '200px' }}
                          />
                          <TextField
                            size="small"
                            type="number"
                            placeholder="Price"
                            value={optionForm.priceModifier}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOptionForm({ ...optionForm, priceModifier: val === '' ? 0 : parseFloat(val) });
                            }}
                            onBlur={(e) => {
                              // Reformat on blur to remove leading zeros
                              const num = parseFloat(e.target.value);
                              if (!isNaN(num)) {
                                setOptionForm({ ...optionForm, priceModifier: num });
                              }
                            }}
                            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography> }}
                            sx={{ width: '120px' }}
                            inputProps={{ step: '0.01' }}
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={optionForm.isDefault}
                                onChange={(e) => setOptionForm({ ...optionForm, isDefault: e.target.checked })}
                              />
                            }
                            label="Default"
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSaveOption(group.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            onClick={handleCancelOptionEdit}
                          >
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        // Display mode
                        <Box
                          key={option.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 1,
                            bgcolor: 'background.default',
                            borderRadius: 1,
                          }}
                        >
                          <DragIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} />
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {option.name}
                          </Typography>
                          <Chip
                            label={formatPrice(option.priceModifier)}
                            size="small"
                            color={option.priceModifier > 0 ? 'success' : 'default'}
                            sx={{ mr: 1 }}
                          />
                          {option.isDefault && (
                            <Chip label="Default" size="small" sx={{ mr: 1 }} />
                          )}
                          <Tooltip title="Edit Option">
                            <IconButton
                              size="small"
                              onClick={() => handleStartEditOption(option)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Option">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteOption(option.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )
                    ))}

                    {/* Inline add form */}
                    {addingOptionToGroup === group.id ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <TextField
                          size="small"
                          placeholder="Option name"
                          value={optionForm.name}
                          onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                          sx={{ flexGrow: 1, minWidth: '200px' }}
                          autoFocus
                        />
                        <TextField
                          size="small"
                          type="number"
                          placeholder="Price"
                          value={optionForm.priceModifier}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOptionForm({ ...optionForm, priceModifier: val === '' ? 0 : parseFloat(val) });
                          }}
                          onBlur={(e) => {
                            // Reformat on blur to remove leading zeros
                            const num = parseFloat(e.target.value);
                            if (!isNaN(num)) {
                              setOptionForm({ ...optionForm, priceModifier: num });
                            }
                          }}
                          InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography> }}
                          sx={{ width: '120px' }}
                          inputProps={{ step: '0.01' }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={optionForm.isDefault}
                              onChange={(e) => setOptionForm({ ...optionForm, isDefault: e.target.checked })}
                            />
                          }
                          label="Default"
                        />
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleSaveOption(group.id)}
                        >
                          Add
                        </Button>
                        <Button
                          size="small"
                          onClick={handleCancelOptionEdit}
                        >
                          Cancel
                        </Button>
                      </Box>
                    ) : (
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => handleStartAddOption(group.id)}
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        Add Option
                      </Button>
                    )}
                </Stack>
                  </>
                )}
              </CardContent>

              {editingGroupId !== group.id && (
                <CardActions>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => handleStartEditGroup(group)}
                    size="small"
                  >
                    Edit Group
                  </Button>
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteGroup(group.id)}
                    color="error"
                    size="small"
                  >
                    Delete Group
                  </Button>
                </CardActions>
              )}
            </Card>
          ))
        )}
      </Stack>

    </Box>
  );
};

export default VariationGroupManager;

import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormGroup,
  Checkbox,
  Chip,
  Divider,
} from '@mui/material';
import { VariationGroup, VariationSelection } from '../services/api';

interface VariationSelectorProps {
  variationGroups: VariationGroup[];
  selectedVariations: VariationSelection[];
  onChange: (selections: VariationSelection[]) => void;
}

const VariationSelector: React.FC<VariationSelectorProps> = ({
  variationGroups,
  selectedVariations,
  onChange,
}) => {
  const handleSingleSelect = (groupId: string, optionId: string) => {
    const newSelections = selectedVariations.filter((s) => s.groupId !== groupId);
    newSelections.push({ groupId, optionIds: [optionId] });
    onChange(newSelections);
  };

  const handleMultiSelect = (groupId: string, optionId: string, checked: boolean) => {
    const existingSelection = selectedVariations.find((s) => s.groupId === groupId);

    if (checked) {
      // Add option to selection
      if (existingSelection) {
        const newSelections = selectedVariations.map((s) =>
          s.groupId === groupId
            ? { ...s, optionIds: [...s.optionIds, optionId] }
            : s
        );
        onChange(newSelections);
      } else {
        onChange([...selectedVariations, { groupId, optionIds: [optionId] }]);
      }
    } else {
      // Remove option from selection
      if (existingSelection) {
        const newOptionIds = existingSelection.optionIds.filter((id) => id !== optionId);
        if (newOptionIds.length > 0) {
          const newSelections = selectedVariations.map((s) =>
            s.groupId === groupId ? { ...s, optionIds: newOptionIds } : s
          );
          onChange(newSelections);
        } else {
          const newSelections = selectedVariations.filter((s) => s.groupId !== groupId);
          onChange(newSelections);
        }
      }
    }
  };

  const isOptionSelected = (groupId: string, optionId: string): boolean => {
    const selection = selectedVariations.find((s) => s.groupId === groupId);
    return selection ? selection.optionIds.includes(optionId) : false;
  };

  const formatPrice = (modifier: number | string): string => {
    const numModifier = Number(modifier);
    if (numModifier === 0) return '';
    const sign = numModifier > 0 ? '+' : '';
    return ` (${sign}$${numModifier.toFixed(2)})`;
  };

  if (!variationGroups || variationGroups.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      {variationGroups.map((group, index) => (
        <Box key={group.id} sx={{ mb: 3 }}>
          {index > 0 && <Divider sx={{ mb: 2 }} />}

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {group.name}
            </Typography>
            {group.required && (
              <Chip
                label="Required"
                size="small"
                color="error"
                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>

          {group.type === 'SINGLE_SELECT' ? (
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={
                  selectedVariations.find((s) => s.groupId === group.id)?.optionIds[0] || ''
                }
                onChange={(e) => handleSingleSelect(group.id, e.target.value)}
              >
                {group.options.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">{option.name}</Typography>
                        {option.priceModifier !== 0 && (
                          <Typography
                            variant="body2"
                            color={option.priceModifier > 0 ? 'success.main' : 'error.main'}
                            sx={{ ml: 1, fontWeight: 500 }}
                          >
                            {formatPrice(option.priceModifier)}
                          </Typography>
                        )}
                        {option.isDefault && (
                          <Chip
                            label="Default"
                            size="small"
                            sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>
          ) : (
            <FormGroup>
              {group.options.map((option) => (
                <FormControlLabel
                  key={option.id}
                  control={
                    <Checkbox
                      checked={isOptionSelected(group.id, option.id)}
                      onChange={(e) =>
                        handleMultiSelect(group.id, option.id, e.target.checked)
                      }
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">{option.name}</Typography>
                      {option.priceModifier !== 0 && (
                        <Typography
                          variant="body2"
                          color={option.priceModifier > 0 ? 'success.main' : 'error.main'}
                          sx={{ ml: 1, fontWeight: 500 }}
                        >
                          {formatPrice(option.priceModifier)}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default VariationSelector;

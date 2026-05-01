import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Copy,
  CopyPlus,
  MoveHorizontal,
  MoveVertical,
  Square,
  Trash2,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/useAppStore';
import type { AlignmentType, DistributionDirection } from '../stores/types';
import type { Rectangle } from '../types';
import {
  canPerformAlignment,
  canPerformDistribution,
  getSelectionParent,
  validateSelection,
} from '../utils/selectionUtils';

interface MultiSelectActionControlsProps {
  variant: 'toolbar' | 'panel';
  className?: string;
  onActionComplete?: () => void;
}

interface ActionButtonProps {
  label: string;
  title: string;
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  icon: React.ReactNode;
  variant: 'toolbar' | 'panel';
  tone?: 'default' | 'danger';
}

const actionButtonClass = (variant: 'toolbar' | 'panel', tone: 'default' | 'danger', disabled: boolean) => {
  const base = variant === 'toolbar'
    ? 'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors'
    : 'h-9 inline-flex items-center justify-start gap-2 rounded-md border px-2 text-xs font-medium transition-colors';

  if (disabled) {
    return `${base} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400`;
  }

  if (tone === 'danger') {
    return `${base} border-red-200 text-red-700 hover:bg-red-50`;
  }

  return `${base} border-gray-200 text-gray-700 hover:bg-gray-50`;
};

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  title,
  disabled = false,
  onClick,
  icon,
  variant,
  tone = 'default',
}) => (
  <button
    type="button"
    className={actionButtonClass(variant, tone, disabled)}
    title={title}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    onMouseDown={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
  >
    {icon}
    {variant === 'panel' && <span className="truncate">{label}</span>}
  </button>
);

const MultiSelectActionControls: React.FC<MultiSelectActionControlsProps> = ({
  variant,
  className,
  onActionComplete,
}) => {
  const { rectangles, selectedIds } = useAppStore(useShallow(state => ({
    rectangles: state.rectangles,
    selectedIds: state.ui.selectedIds,
  })));

  const {
    alignRectangles,
    distributeRectangles,
    makeSameSize,
    bulkDelete,
  } = useAppStore(state => state.rectangleActions);
  const { copyRectangles, duplicateRectangles } = useAppStore(state => state.clipboardActions);

  if (selectedIds.length <= 1) return null;

  const selectedRectangles = selectedIds
    .map(id => rectangles.find(rect => rect.id === id))
    .filter((rect): rect is Rectangle => rect !== undefined);
  const selectionIsValid = validateSelection(selectedIds, rectangles);
  const selectionParentId = getSelectionParent(selectedIds, rectangles);
  const selectionParent = selectionParentId ? rectangles.find(rect => rect.id === selectionParentId) : null;
  const parentAllowsManualPositioning = selectionParentId === null || Boolean(selectionParent?.isManualPositioningEnabled);
  const hasLockedSelection = selectedRectangles.some(rect => rect.isLockedAsIs);
  const canAlignSelection = canPerformAlignment(selectedIds, rectangles) && parentAllowsManualPositioning && !hasLockedSelection;
  const canDistributeSelection = canPerformDistribution(selectedIds, rectangles) && parentAllowsManualPositioning && !hasLockedSelection;
  const canSameSizeSelection = canAlignSelection;

  const positioningDisabledTitle = 'Enable manual positioning on parent to align selected rectangles.';
  const invalidSelectionTitle = 'Select rectangles with the same parent and exclude text labels.';
  const lockedSelectionTitle = 'Unlock selected rectangles before changing their position or size.';

  const getPositionActionTitle = (enabled: boolean, fallback: string) => {
    if (enabled) return fallback;
    if (!selectionIsValid) return invalidSelectionTitle;
    if (hasLockedSelection) return lockedSelectionTitle;
    if (!parentAllowsManualPositioning) return positioningDisabledTitle;
    return fallback;
  };

  const runAction = (action: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    action();
    onActionComplete?.();
  };

  const alignActions: Array<{ type: AlignmentType; label: string; icon: React.ReactNode }> = [
    { type: 'left', label: 'Align left', icon: <AlignLeft size={16} /> },
    { type: 'center', label: 'Align center', icon: <AlignCenter size={16} /> },
    { type: 'right', label: 'Align right', icon: <AlignRight size={16} /> },
    { type: 'top', label: 'Align top', icon: <AlignVerticalJustifyStart size={16} /> },
    { type: 'middle', label: 'Align middle', icon: <AlignVerticalJustifyCenter size={16} /> },
    { type: 'bottom', label: 'Align bottom', icon: <AlignVerticalJustifyEnd size={16} /> },
  ];

  const distributeActions: Array<{ direction: DistributionDirection; label: string; icon: React.ReactNode }> = [
    { direction: 'horizontal', label: 'Distribute horizontal', icon: <MoveHorizontal size={16} /> },
    { direction: 'vertical', label: 'Distribute vertical', icon: <MoveVertical size={16} /> },
  ];

  const containerClass = variant === 'toolbar'
    ? `flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-lg ${className ?? ''}`
    : `space-y-3 ${className ?? ''}`;

  return (
    <div
      className={containerClass}
      role="toolbar"
      aria-label="Multi-select actions"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {variant === 'panel' && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Bulk Operations</h3>
        </div>
      )}

      <div className={variant === 'toolbar' ? 'flex items-center gap-1' : 'grid grid-cols-2 gap-2'}>
        {alignActions.map(action => (
          <ActionButton
            key={action.type}
            variant={variant}
            label={action.label}
            title={getPositionActionTitle(canAlignSelection, action.label)}
            disabled={!canAlignSelection}
            icon={action.icon}
            onClick={runAction(() => alignRectangles(selectedIds, action.type))}
          />
        ))}
      </div>

      {variant === 'toolbar' && <div className="mx-1 h-6 w-px bg-gray-200" />}

      <div className={variant === 'toolbar' ? 'flex items-center gap-1' : 'grid grid-cols-2 gap-2'}>
        {distributeActions.map(action => (
          <ActionButton
            key={action.direction}
            variant={variant}
            label={action.label}
            title={
              selectedIds.length < 3
                ? 'Select at least 3 rectangles to distribute.'
                : getPositionActionTitle(canDistributeSelection, action.label)
            }
            disabled={!canDistributeSelection}
            icon={action.icon}
            onClick={runAction(() => distributeRectangles(selectedIds, action.direction))}
          />
        ))}
        <ActionButton
          variant={variant}
          label="Same size"
          title={getPositionActionTitle(canSameSizeSelection, 'Make selected rectangles the same size')}
          disabled={!canSameSizeSelection}
          icon={<Square size={16} />}
          onClick={runAction(() => makeSameSize(selectedIds))}
        />
      </div>

      {variant === 'toolbar' && <div className="mx-1 h-6 w-px bg-gray-200" />}

      <div className={variant === 'toolbar' ? 'flex items-center gap-1' : 'grid grid-cols-2 gap-2'}>
        <ActionButton
          variant={variant}
          label="Copy"
          title="Copy selected rectangles"
          icon={<Copy size={16} />}
          onClick={runAction(() => copyRectangles(selectedIds))}
        />
        <ActionButton
          variant={variant}
          label="Duplicate"
          title="Duplicate selected rectangles"
          icon={<CopyPlus size={16} />}
          onClick={runAction(() => duplicateRectangles(selectedIds))}
        />
        <ActionButton
          variant={variant}
          label="Delete"
          title={selectionIsValid ? 'Delete selected rectangles' : invalidSelectionTitle}
          disabled={!selectionIsValid}
          tone="danger"
          icon={<Trash2 size={16} />}
          onClick={runAction(() => bulkDelete(selectedIds))}
        />
      </div>
    </div>
  );
};

export default MultiSelectActionControls;

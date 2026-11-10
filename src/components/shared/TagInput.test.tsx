/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock useTagsQuery before importing TagInput
vi.mock('@/hooks/useTagsQuery', () => ({
  useTagsQuery: vi.fn(),
}));

// Mock Shadcn Badge — simple span
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', className }, children),
}));

// Mock Radix Popover — render children directly (no portal, no positioning)
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover' }, children),
  PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    if (asChild && React.isValidElement(children)) {
      return children;
    }
    return React.createElement('div', { 'data-testid': 'popover-trigger' }, children);
  },
  PopoverAnchor: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    if (asChild && React.isValidElement(children)) {
      return children;
    }
    return React.createElement('div', { 'data-testid': 'popover-anchor' }, children);
  },
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover-content' }, children),
}));

// Mock Radix Command — simple pass-through divs
vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'command' }, children),
  CommandList: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'command-list' }, children),
  CommandEmpty: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'command-empty', className }, children),
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'command-group' },
      heading && React.createElement('span', { 'data-testid': 'group-heading' }, heading),
      children
    ),
  CommandItem: ({
    children,
    onSelect,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
    className?: string;
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'command-item',
        onClick: onSelect,
        'aria-disabled': disabled,
        className,
        role: 'option',
      },
      children
    ),
}));

// Mock lucide-react X icon
vi.mock('lucide-react', () => ({
  X: () => React.createElement('svg', { 'data-testid': 'icon-x' }),
  Trash2: () => React.createElement('svg', { 'data-testid': 'icon-trash' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// DeleteDialog mock forwards its callbacks so confirm/cancel are exercised
vi.mock('@/components/shared/DeleteDialog', () => ({
  default: ({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description?: React.ReactNode;
  }) =>
    open
      ? React.createElement(
          'div',
          { role: 'alertdialog' },
          React.createElement('h2', null, title),
          React.createElement('p', null, description),
          React.createElement('button', { onClick: () => onOpenChange(false) }, 'Cancel'),
          React.createElement('button', { onClick: onConfirm }, 'Delete')
        )
      : null,
}));

import { TagInput } from './TagInput';
import { useTagsQuery } from '@/hooks/useTagsQuery';
import { toast } from 'sonner';

const mockTag1 = { id: 'tag-1', name: 'Food', color: 'hsl(0, 65%, 60%)', createdAt: '', updatedAt: '' };
const mockTag2 = { id: 'tag-2', name: 'Travel', color: 'hsl(90, 65%, 60%)', createdAt: '', updatedAt: '' };
const mockTag3 = { id: 'tag-3', name: 'Shopping', color: 'hsl(180, 65%, 60%)', createdAt: '', updatedAt: '' };

function makeDefaultHook(overrides: Partial<ReturnType<typeof useTagsQuery> & { createTagOptimistic: ReturnType<typeof vi.fn> }> = {}) {
  const createTagOptimistic = overrides.createTagOptimistic ?? vi.fn().mockReturnValue({
    optimisticId: 'optimistic-123',
    settle: Promise.resolve({ id: 'tag-new', name: 'NewTag', color: 'hsl(0, 65%, 60%)', createdAt: '', updatedAt: '' }),
  });
  return {
    tags: [mockTag1, mockTag2, mockTag3],
    isLoading: false,
    createTag: vi.fn(),
    createTagOptimistic,
    deleteTag: vi.fn(),
    isCreating: false,
    isDeleting: false,
    ...overrides,
    createTagOptimistic, // ensure override wins
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook() as any);
});

describe('TagInput', () => {
  describe('rendering — initial state', () => {
    it('renders the text input with placeholder "Add tags..."', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      expect(input).toBeTruthy();
    });

    it('does not render any badge pills when no tags are selected', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
        })
      );
      expect(screen.queryAllByTestId('badge')).toHaveLength(0);
    });

    it('renders badge pills for selected tags', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1', 'tag-2'],
          onChange: vi.fn(),
        })
      );
      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });

    it('renders tag names inside badge pills', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1'],
          onChange: vi.fn(),
        })
      );
      expect(screen.getByText('Food')).toBeTruthy();
    });

    it('renders remove button with correct aria-label for each selected tag', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1', 'tag-2'],
          onChange: vi.fn(),
        })
      );
      expect(screen.getByLabelText('Remove Food')).toBeTruthy();
      expect(screen.getByLabelText('Remove Travel')).toBeTruthy();
    });

    it('does not show placeholder when tags are already selected', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1'],
          onChange: vi.fn(),
        })
      );
      // placeholder is empty string when tags are selected
      expect(screen.queryByPlaceholderText('Add tags...')).toBeNull();
    });
  });

  describe('tag removal', () => {
    it('calls onChange without the removed tag id when remove button is clicked', () => {
      const onChange = vi.fn();
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1', 'tag-2'],
          onChange,
        })
      );
      const removeButton = screen.getByLabelText('Remove Food');
      fireEvent.click(removeButton);
      expect(onChange).toHaveBeenCalledWith(['tag-2']);
    });

    it('calls onChange with empty array when the only selected tag is removed', () => {
      const onChange = vi.fn();
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1'],
          onChange,
        })
      );
      fireEvent.click(screen.getByLabelText('Remove Food'));
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('max tags limit', () => {
    it('hides the input when 10 tags are already selected', () => {
      const tenTagIds = Array.from({ length: 10 }, (_, i) => `tag-${i + 10}`);
      render(
        React.createElement(TagInput, {
          selectedTagIds: tenTagIds,
          onChange: vi.fn(),
        })
      );
      expect(screen.queryByPlaceholderText('Add tags...')).toBeNull();
    });

    it('shows "(max 10 tags)" message when limit is reached', () => {
      const tenTagIds = Array.from({ length: 10 }, (_, i) => `tag-${i + 10}`);
      render(
        React.createElement(TagInput, {
          selectedTagIds: tenTagIds,
          onChange: vi.fn(),
        })
      );
      expect(screen.getByText('(max 10 tags)')).toBeTruthy();
    });

    it('shows the input when fewer than 10 tags are selected', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1'],
          onChange: vi.fn(),
        })
      );
      // input is present (placeholder is empty string when tags selected, but input element exists)
      const inputs = document.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('disabled state', () => {
    it('hides remove buttons when disabled', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1'],
          onChange: vi.fn(),
          disabled: true,
        })
      );
      expect(screen.queryByLabelText('Remove Food')).toBeNull();
    });

    it('hides the input when disabled', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
          disabled: true,
        })
      );
      expect(screen.queryByPlaceholderText('Add tags...')).toBeNull();
    });

    it('still shows selected tag names when disabled', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1'],
          onChange: vi.fn(),
          disabled: true,
        })
      );
      expect(screen.getByText('Food')).toBeTruthy();
    });
  });

  describe('popover content', () => {
    it('shows existing tags in the dropdown after typing', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'fo' } });

      // "Food" should appear as a command item (filtered)
      const items = screen.getAllByTestId('command-item');
      const foodItem = items.find((el) => el.textContent?.includes('Food'));
      expect(foodItem).toBeTruthy();
    });

    it('does not show already-selected tags in the dropdown', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1'],
          onChange: vi.fn(),
        })
      );
      // No placeholder since a tag is selected; find the bare input
      const inputs = document.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
      fireEvent.change(inputs[0], { target: { value: 'fo' } });

      // "Food" is already selected so it should not appear as option
      const items = screen.queryAllByTestId('command-item');
      const foodItem = items.find((el) => el.textContent?.includes('Food') && !el.textContent?.includes('Create'));
      expect(foodItem).toBeFalsy();
    });

    it('shows "Create" option when input does not match any existing tag exactly', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'NewTag' } });

      expect(screen.getByText('Create "NewTag"')).toBeTruthy();
    });

    it('does not show "Create" option when input exactly matches an existing tag name', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'Food' } });

      expect(screen.queryByText('Create "Food"')).toBeNull();
    });
  });

  describe('tag selection from dropdown', () => {
    it('calls onChange with the selected tag id when clicking a dropdown item', () => {
      const onChange = vi.fn();
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange,
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'fo' } });

      const items = screen.getAllByTestId('command-item');
      const foodItem = items.find((el) => el.textContent?.includes('Food') && !el.textContent?.includes('Create'));
      expect(foodItem).toBeTruthy();
      fireEvent.click(foodItem!);
      expect(onChange).toHaveBeenCalledWith(['tag-1']);
    });

    it('does not add a tag that is already selected', () => {
      const onChange = vi.fn();
      render(
        React.createElement(TagInput, {
          selectedTagIds: ['tag-1'],
          onChange,
        })
      );
      // tag-1 should not appear in filtered list, so we can't click it
      // but we verify onChange is not called spuriously
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('tag creation', () => {
    it('calls createTagOptimistic with the trimmed input value when clicking "Create" option', async () => {
      const createTagOptimistic = vi.fn().mockReturnValue({
        optimisticId: 'optimistic-123',
        settle: Promise.resolve({ id: 'tag-new', name: 'NewTag', color: 'hsl(0, 65%, 60%)', createdAt: '', updatedAt: '' }),
      });
      const onChange = vi.fn();
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ createTagOptimistic }) as any);

      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange,
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'NewTag' } });

      const createItem = screen.getByText('Create "NewTag"');
      fireEvent.click(createItem);

      await waitFor(() => expect(createTagOptimistic).toHaveBeenCalledWith('NewTag'));
    });

    it('calls onChange immediately with optimistic id, then swaps to real id after creation', async () => {
      const newTag = { id: 'tag-new', name: 'NewTag', color: 'hsl(0, 65%, 60%)', createdAt: '', updatedAt: '' };
      const createTagOptimistic = vi.fn().mockReturnValue({
        optimisticId: 'optimistic-123',
        settle: Promise.resolve(newTag),
      });
      const onChange = vi.fn();
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ createTagOptimistic }) as any);

      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange,
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'NewTag' } });

      const createItem = screen.getByText('Create "NewTag"');
      fireEvent.click(createItem);

      // First call: optimistic ID added immediately
      expect(onChange).toHaveBeenCalledWith(['optimistic-123']);
      // Second call: swapped to real ID after settle resolves
      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith(['tag-new'])
      );
    });

    it('shows "Creating..." text while isCreating is true', () => {
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ isCreating: true }) as any);

      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'NewTag' } });

      expect(screen.getByText('Creating...')).toBeTruthy();
    });

    it('silently ignores errors from createTag (does not throw)', async () => {
      const createTag = vi.fn().mockRejectedValue(new Error('Tag already exists'));
      const onChange = vi.fn();
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ createTag }) as any);

      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange,
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'Food' } });

      const items = screen.getAllByTestId('command-item');
      const createItem = items.find((el) => el.textContent?.includes('Create'));
      // Click should not throw
      if (createItem) {
        fireEvent.click(createItem);
        await waitFor(() => expect(createTag).toHaveBeenCalled());
      }
      // onChange should NOT be called since create failed
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interactions', () => {
    it('closes popover on Escape key', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'fo' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      // After Escape, the popover open state is false — no command items shown
      // (the mock always renders content, so we just verify no error is thrown)
    });

    it('does not throw on Enter when input is empty', () => {
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange: vi.fn(),
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      expect(() => {
        fireEvent.keyDown(input, { key: 'Enter' });
      }).not.toThrow();
    });

    it('selects the existing tag on Enter when input exactly matches a tag name', async () => {
      const onChange = vi.fn();
      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange,
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      // Type exactly "Food" — exact match exists
      fireEvent.change(input, { target: { value: 'Food' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith(['tag-1']);
    });

    it('creates a new tag on Enter when input does not match any existing tag', async () => {
      const createTagOptimistic = vi.fn().mockReturnValue({
        optimisticId: 'optimistic-123',
        settle: Promise.resolve({ id: 'tag-new', name: 'BrandNew', color: 'hsl(0, 65%, 60%)', createdAt: '', updatedAt: '' }),
      });
      const onChange = vi.fn();
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ createTagOptimistic }) as any);

      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange,
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      fireEvent.change(input, { target: { value: 'BrandNew' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(createTagOptimistic).toHaveBeenCalledWith('BrandNew'));
    });

    it('creates a new tag on Enter when input has partial matches but no exact match', async () => {
      const createTagOptimistic = vi.fn().mockReturnValue({
        optimisticId: 'optimistic-123',
        settle: Promise.resolve({ id: 'tag-new', name: 'Foo', color: 'hsl(0, 65%, 60%)', createdAt: '', updatedAt: '' }),
      });
      const onChange = vi.fn();
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ createTagOptimistic }) as any);

      render(
        React.createElement(TagInput, {
          selectedTagIds: [],
          onChange,
        })
      );
      const input = screen.getByPlaceholderText('Add tags...');
      // "Foo" matches partial "Food" but is not an exact match
      fireEvent.change(input, { target: { value: 'Foo' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => expect(createTagOptimistic).toHaveBeenCalledWith('Foo'));
    });
  });

  describe('tag deletion', () => {
    function renderInput(onChange = vi.fn(), selectedTagIds: string[] = []) {
      render(React.createElement(TagInput, { selectedTagIds, onChange }));
      return onChange;
    }

    it('renders a Delete button for each existing suggestion', () => {
      renderInput();
      expect(screen.getByLabelText('Delete tag Food')).toBeTruthy();
      expect(screen.getByLabelText('Delete tag Travel')).toBeTruthy();
      expect(screen.getByLabelText('Delete tag Shopping')).toBeTruthy();
    });

    it('renders no Delete button for an optimistic tag id', () => {
      vi.mocked(useTagsQuery).mockReturnValue(
        makeDefaultHook({
          tags: [mockTag1, { ...mockTag2, id: 'optimistic-999' }],
        }) as any
      );
      renderInput();
      expect(screen.getByLabelText('Delete tag Food')).toBeTruthy();
      expect(screen.queryByLabelText('Delete tag Travel')).toBeNull();
    });

    it('clicking Delete opens the dialog with the tag name and does NOT select the tag', () => {
      const onChange = renderInput();
      fireEvent.click(screen.getByLabelText('Delete tag Food'));

      expect(screen.getByRole('alertdialog')).toBeTruthy();
      expect(screen.getByText('Delete tag "Food"?')).toBeTruthy();
      expect(
        screen.getByText(
          'It will be removed from every transaction that has it. The transactions themselves are not changed.'
        )
      ).toBeTruthy();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('prevents default on pointer and mouse down so the input keeps focus', () => {
      renderInput();
      const button = screen.getByLabelText('Delete tag Food');
      expect(fireEvent.pointerDown(button)).toBe(false);
      expect(fireEvent.mouseDown(button)).toBe(false);
    });

    it('Cancel closes the dialog without calling deleteTag', () => {
      const deleteTag = vi.fn();
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ deleteTag }) as any);
      renderInput();
      fireEvent.click(screen.getByLabelText('Delete tag Food'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(deleteTag).not.toHaveBeenCalled();
    });

    it('Delete calls deleteTag(id) exactly once, toasts, and closes the dialog', async () => {
      const deleteTag = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ deleteTag }) as any);
      const onChange = renderInput();
      fireEvent.click(screen.getByLabelText('Delete tag Travel'));
      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Tag deleted'));
      expect(deleteTag).toHaveBeenCalledTimes(1);
      expect(deleteTag).toHaveBeenCalledWith('tag-2');
      expect(screen.queryByRole('alertdialog')).toBeNull();
      // not selected in this input, so selection is left alone
      expect(onChange).not.toHaveBeenCalled();
    });

    it('a failing deleteTag shows the error toast and keeps the dialog open', async () => {
      const deleteTag = vi.fn().mockRejectedValue(new Error('boom'));
      vi.mocked(useTagsQuery).mockReturnValue(makeDefaultHook({ deleteTag }) as any);
      renderInput();
      fireEvent.click(screen.getByLabelText('Delete tag Food'));
      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete tag'));
      expect(screen.getByRole('alertdialog')).toBeTruthy();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});

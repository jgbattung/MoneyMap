import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagFilter } from './TagFilter';

// ---------------------------------------------------------------------------
// Mock: useTagsQuery
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useTagsQuery', () => ({
  useTagsQuery: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: Popover — render children inline so the content is always visible
// ---------------------------------------------------------------------------
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover' }, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover-trigger' }, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover-content' }, children),
}));

// ---------------------------------------------------------------------------
// Mock: Checkbox — render a visible checkbox element
// ---------------------------------------------------------------------------
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked }: { checked: boolean }) =>
    React.createElement('span', {
      'data-testid': 'checkbox',
      'data-checked': String(checked),
    }),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { useTagsQuery } from '@/hooks/useTagsQuery';
import type { Tag } from '@/hooks/useTagsQuery';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const mockTags: Tag[] = [
  { id: 'tag-1', name: 'Housing', color: '#FF6B6B', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'tag-2', name: 'Transport', color: '#4ECDC4', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'tag-3', name: 'Food', color: '#45B7D1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

// ---------------------------------------------------------------------------
// Setup helper
// ---------------------------------------------------------------------------
function setupTagsQuery(tags: Tag[] = mockTags, isLoading = false) {
  vi.mocked(useTagsQuery).mockReturnValue({
    tags,
    isLoading,
    createTag: vi.fn(),
    createTagOptimistic: vi.fn(),
    deleteTag: vi.fn(),
    isCreating: false,
    isDeleting: false,
  });
}

function renderTagFilter(props: {
  selectedTagIds?: string[];
  onChange?: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const {
    selectedTagIds = [],
    onChange = vi.fn(),
    disabled = false,
  } = props;
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(TagFilter, { selectedTagIds, onChange, disabled })
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TagFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTagsQuery();
  });

  // -------------------------------------------------------------------------
  describe('rendering — trigger button', () => {
    it('shows "Tags" label when no tags are selected', () => {
      renderTagFilter({ selectedTagIds: [] });
      expect(screen.getByText('Tags')).toBeTruthy();
    });

    it('shows "Tags (2)" when two tags are selected', () => {
      renderTagFilter({ selectedTagIds: ['tag-1', 'tag-2'] });
      expect(screen.getByText('Tags (2)')).toBeTruthy();
    });

    it('shows "Tags (1)" when one tag is selected', () => {
      renderTagFilter({ selectedTagIds: ['tag-3'] });
      expect(screen.getByText('Tags (1)')).toBeTruthy();
    });

    it('renders popover content with tag list', () => {
      renderTagFilter({ selectedTagIds: [] });
      expect(screen.getByText('Housing')).toBeTruthy();
      expect(screen.getByText('Transport')).toBeTruthy();
      expect(screen.getByText('Food')).toBeTruthy();
    });

    it('button is disabled when disabled prop is true', () => {
      renderTagFilter({ disabled: true });
      const button = screen.getByRole('button', { name: /tags/i });
      expect(button.hasAttribute('disabled')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('disabled state — no tags exist', () => {
    it('button is disabled when tag list is empty and not loading', () => {
      setupTagsQuery([]);
      renderTagFilter({ selectedTagIds: [] });
      const button = screen.getByRole('button', { name: /tags/i });
      expect(button.hasAttribute('disabled')).toBe(true);
    });

    it('shows "No tags found" message in popover content when no tags exist', () => {
      setupTagsQuery([]);
      renderTagFilter({ selectedTagIds: [] });
      expect(screen.getByText('No tags found')).toBeTruthy();
    });

    it('button is NOT disabled when tags exist', () => {
      setupTagsQuery(mockTags);
      renderTagFilter({ selectedTagIds: [] });
      const button = screen.getByRole('button', { name: /tags/i });
      expect(button.hasAttribute('disabled')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('tag selection', () => {
    it('calls onChange with added tag ID when a tag row is clicked', () => {
      const onChange = vi.fn();
      renderTagFilter({ selectedTagIds: [], onChange });

      const housingButton = screen.getByText('Housing').closest('button');
      if (housingButton) fireEvent.click(housingButton);

      expect(onChange).toHaveBeenCalledWith(['tag-1']);
    });

    it('calls onChange without the tag ID when a selected tag row is clicked (deselect)', () => {
      const onChange = vi.fn();
      renderTagFilter({ selectedTagIds: ['tag-1'], onChange });

      // 'Housing' appears in both the list and the badge pill — target the list button
      const housingElements = screen.getAllByText('Housing');
      const housingButton = housingElements[0].closest('button');
      if (housingButton) fireEvent.click(housingButton);

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('calls onChange with all existing plus new ID when a second tag is selected', () => {
      const onChange = vi.fn();
      renderTagFilter({ selectedTagIds: ['tag-1'], onChange });

      const transportButton = screen.getByText('Transport').closest('button');
      if (transportButton) fireEvent.click(transportButton);

      expect(onChange).toHaveBeenCalledWith(['tag-1', 'tag-2']);
    });
  });

  // -------------------------------------------------------------------------
  describe('search within popover', () => {
    it('filters the tag list when user types in the search input', () => {
      renderTagFilter({ selectedTagIds: [] });

      const searchInput = screen.getByPlaceholderText('Search tags...');
      fireEvent.change(searchInput, { target: { value: 'hous' } });

      expect(screen.getByText('Housing')).toBeTruthy();
      expect(screen.queryByText('Transport')).toBeNull();
      expect(screen.queryByText('Food')).toBeNull();
    });

    it('search is case-insensitive', () => {
      renderTagFilter({ selectedTagIds: [] });

      const searchInput = screen.getByPlaceholderText('Search tags...');
      fireEvent.change(searchInput, { target: { value: 'FOOD' } });

      expect(screen.getByText('Food')).toBeTruthy();
      expect(screen.queryByText('Housing')).toBeNull();
    });

    it('shows "No tags found" when search matches nothing', () => {
      renderTagFilter({ selectedTagIds: [] });

      const searchInput = screen.getByPlaceholderText('Search tags...');
      fireEvent.change(searchInput, { target: { value: 'xyz-no-match' } });

      expect(screen.getByText('No tags found')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('clear all', () => {
    it('shows "Clear all" button when tags are selected', () => {
      renderTagFilter({ selectedTagIds: ['tag-1', 'tag-2'] });
      expect(screen.getByText('Clear all')).toBeTruthy();
    });

    it('does NOT show "Clear all" when no tags are selected', () => {
      renderTagFilter({ selectedTagIds: [] });
      expect(screen.queryByText('Clear all')).toBeNull();
    });

    it('calls onChange([]) when "Clear all" is clicked', () => {
      const onChange = vi.fn();
      renderTagFilter({ selectedTagIds: ['tag-1', 'tag-2'], onChange });

      const clearButton = screen.getByText('Clear all');
      fireEvent.click(clearButton);

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  // -------------------------------------------------------------------------
  describe('selected tag pills (badges)', () => {
    it('renders badge pills for selected tags', () => {
      renderTagFilter({ selectedTagIds: ['tag-1', 'tag-3'] });
      // Housing and Food should appear as badges below the trigger
      const housingElements = screen.getAllByText('Housing');
      const foodElements = screen.getAllByText('Food');
      // at least two Housing elements: one in the list, one as a pill
      expect(housingElements.length).toBeGreaterThanOrEqual(1);
      expect(foodElements.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onChange removing tag when the pill remove button is clicked', () => {
      const onChange = vi.fn();
      renderTagFilter({ selectedTagIds: ['tag-1'], onChange });

      const removeButton = screen.getByRole('button', { name: /remove housing filter/i });
      fireEvent.click(removeButton);

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('does not render pill section when no tags are selected', () => {
      renderTagFilter({ selectedTagIds: [] });
      expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('checkbox state', () => {
    it('checkbox for a selected tag has data-checked=true', () => {
      renderTagFilter({ selectedTagIds: ['tag-2'] });
      const checkboxes = screen.getAllByTestId('checkbox');
      // Transport is tag-2, it's selected
      const transportCheckbox = checkboxes[1]; // order: Housing, Transport, Food
      expect(transportCheckbox.getAttribute('data-checked')).toBe('true');
    });

    it('checkbox for an unselected tag has data-checked=false', () => {
      renderTagFilter({ selectedTagIds: ['tag-2'] });
      const checkboxes = screen.getAllByTestId('checkbox');
      const housingCheckbox = checkboxes[0];
      expect(housingCheckbox.getAttribute('data-checked')).toBe('false');
    });
  });
});
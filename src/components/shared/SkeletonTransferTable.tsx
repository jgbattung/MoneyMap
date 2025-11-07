import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, SearchIcon } from 'lucide-react';

const SkeletonTransferTable = () => {
  const dateFilterOptions = {
    viewAll: "view-all",
    thisWeek: "this-week",
    thisMonth: "this-month",
    thisYear: "this-year",
  }

  const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        {/* Quick filter */}
        <div>
          <ToggleGroup type="single" variant="outline" size="sm" disabled>
            <ToggleGroupItem
              value={dateFilterOptions.viewAll}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
            >
              View all
            </ToggleGroupItem>
            <ToggleGroupItem
              value={dateFilterOptions.thisWeek}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
            >
              This week
            </ToggleGroupItem>
            <ToggleGroupItem
              value={dateFilterOptions.thisMonth}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
            >
              This month
            </ToggleGroupItem>
            <ToggleGroupItem
              value={dateFilterOptions.thisYear}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
            >
              This year
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Search */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs">
            <InputGroup>
              <InputGroupInput 
                placeholder='Search expenses...' 
                disabled
              />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='p-4'>Date</TableHead>
              <TableHead className='p-4'>Name</TableHead>
              <TableHead className='p-4'>Amount</TableHead>
              <TableHead className='p-4'>From account</TableHead>
              <TableHead className='p-4'>To account</TableHead>
              <TableHead className='p-4'>Transfer type</TableHead>
              <TableHead className='p-4'>notes</TableHead>
              <TableHead className='p-4'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="h-[300px]">
                <div className="flex items-center justify-center">
                  <Spinner className="size-6" />
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4 px-4 border border-border border-t-2">
          <div>
            <p className='text-sm text-muted-foreground'>Loading...</p>
          </div>
          <div className='flex items-center gap-1'>
            <button
              className='text-muted-foreground transition-colors disabled:hover:text-muted-foreground'
              disabled
            >
              <ChevronLeft size={22} strokeWidth={1} />
            </button>
            <div className='flex items-center gap-1'>
              <button
                disabled
                className='px-3 py-1 text-sm rounded transition-colors bg-primary-700/30 text-primary-foreground'
              >
                1
              </button>
            </div>
            <button
              className='text-muted-foreground transition-colors disabled:hover:text-muted-foreground'
              disabled
            >
              <ChevronRight size={22} strokeWidth={1} />
            </button>
          </div>
          <div className='flex items-center justify-center gap-2'>
            <p className='text-sm text-muted-foreground'>Rows per page</p>
            <Select disabled value="10">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonTransferTable;
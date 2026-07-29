import { useQuery } from '@tanstack/react-query';
import { CalendarSummaryResponse } from '@/types/calendar';

async function fetchCalendarSummary(start: string, end: string): Promise<CalendarSummaryResponse> {
  const searchParams = new URLSearchParams({ start, end });
  const response = await fetch(`/api/calendar/summary?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch calendar summary');
  }

  return response.json();
}

export const useCalendarSummary = (start: string, end: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['calendarSummary', { start, end }],
    queryFn: () => fetchCalendarSummary(start, end),
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    error: error ? (error as Error).message : null,
  };
};

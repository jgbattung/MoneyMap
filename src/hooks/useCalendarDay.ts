import { useQuery } from '@tanstack/react-query';
import { CalendarDayResponse } from '@/types/calendar';

async function fetchCalendarDay(date: string): Promise<CalendarDayResponse> {
  const searchParams = new URLSearchParams({ date });
  const response = await fetch(`/api/calendar/day?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch calendar day');
  }

  return response.json();
}

export const useCalendarDay = (date: string | null) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['calendarDay', { date }],
    queryFn: () => fetchCalendarDay(date as string),
    enabled: !!date,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    error: error ? (error as Error).message : null,
  };
};

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase/types';

type SurveyResponse = Database['public']['Tables']['survey_responses']['Row'] & {
  attendee: Database['public']['Tables']['attendees']['Row'];
};

interface UseVisualizationDataOptions {
  realtime?: boolean;
}

// Fallback mock data
const mockData: SurveyResponse[] = [
  {
    id: 'mock-1',
    attendee_id: 'mock-attendee-1',
    years_at_medtronic: 5,
    learning_style: 'visual',
    shaped_by: 'mentor',
    peak_performance: 'Extrovert, Morning',
    motivation: 'growth',
    unique_quality: 'Mock response 1',
    status: 'pending',
    moderated_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    attendee: {
      id: 'mock-attendee-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      is_anonymous: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  {
    id: 'mock-2',
    attendee_id: 'mock-attendee-2',
    years_at_medtronic: 10,
    learning_style: 'auditory',
    shaped_by: 'challenge',
    peak_performance: 'Introvert, Morning',
    motivation: 'impact',
    unique_quality: 'Mock response 2',
    status: 'pending',
    moderated_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    attendee: {
      id: 'mock-attendee-2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      is_anonymous: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  {
    id: 'mock-3',
    attendee_id: 'mock-attendee-3',
    years_at_medtronic: 15,
    learning_style: 'kinesthetic',
    shaped_by: 'success',
    peak_performance: 'Ambivert, Morning',
    motivation: 'purpose',
    unique_quality: 'Mock response 3',
    status: 'pending',
    moderated_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    attendee: {
      id: 'mock-attendee-3',
      first_name: 'Bob',
      last_name: 'Johnson',
      email: 'bob@example.com',
      is_anonymous: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }
];

export function useVisualizationData({ realtime = true }: UseVisualizationDataOptions = {}) {
  const [data, setData] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: responses, error: fetchError } = await supabase
          .from('survey_responses')
          .select(`
            *,
            attendee:attendees(*)
          `);

        if (fetchError) {
          console.warn('Supabase fetch error, using mock data:', fetchError);
          if (mounted) {
            setData(mockData);
          }
          return;
        }

        if (mounted) {
          // Use real data if available, otherwise fall back to mock data
          setData(responses && responses.length > 0 ? responses : mockData);
        }
      } catch (err) {
        console.warn('Error fetching data, using mock data:', err);
        if (mounted) {
          setData(mockData);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    if (realtime) {
      const channel = supabase
        .channel('survey_responses_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'survey_responses',
          },
          async (payload) => {
            if (mounted) {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const { data: response, error: fetchError } = await supabase
                  .from('survey_responses')
                  .select(`
                    *,
                    attendee:attendees(*)
                  `)
                  .eq('id', payload.new.id)
                  .single();

                if (!fetchError && response) {
                  setData((currentData) => {
                    const newData = [...currentData];
                    const index = newData.findIndex((item) => item.id === response.id);

                    if (index !== -1) {
                      newData[index] = response;
                    } else {
                      newData.push(response);
                    }

                    return newData;
                  });
                }
              } else if (payload.eventType === 'DELETE') {
                setData((currentData) => currentData.filter((item) => item.id !== payload.old.id));
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    return () => {
      mounted = false;
    };
  }, [supabase, realtime]);

  return {
    data,
    isLoading,
    error,
  };
} 
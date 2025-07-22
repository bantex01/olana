import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';

export const useTags = () => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const fetchTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tags`);
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return {
    availableTags,
    fetchTags,
  };
};
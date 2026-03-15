import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Tag = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

const QUERY_KEYS = {
  tags: ["tags"] as const,
};

const fetchTags = async (): Promise<Tag[]> => {
  const response = await fetch("/api/tags");
  if (!response.ok) throw new Error("Failed to fetch tags");
  return response.json();
};

const createTagRequest = async (name: string): Promise<Tag> => {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (response.status === 409) throw new Error("Tag already exists");
  if (!response.ok) throw new Error("Failed to create tag");
  return response.json();
};

const deleteTagRequest = async (id: string): Promise<void> => {
  const response = await fetch(`/api/tags/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete tag");
};

export const useTagsQuery = () => {
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.tags,
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000,
  });

  const createTagMutation = useMutation({
    mutationFn: createTagRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTagRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });

  return {
    tags,
    isLoading,
    createTag: createTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
    isCreating: createTagMutation.isPending,
    isDeleting: deleteTagMutation.isPending,
  };
};

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
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTagRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });

  // Returns the optimistic tag immediately so the caller can add it to selection
  // before the API resolves. The cache is updated optimistically in onMutate
  // and replaced with the real tag on onSuccess.
  const createTagOptimistic = (name: string): { optimisticId: string; settle: Promise<Tag> } => {
    const optimisticId = `optimistic-${Date.now()}`;
    // Inject into cache immediately so the pill renders right away
    queryClient.setQueryData<Tag[]>(QUERY_KEYS.tags, (old = []) => {
      if (old.some((t) => t.id === optimisticId)) return old;
      return [
        ...old,
        {
          id: optimisticId,
          name,
          color: "hsl(0, 0%, 60%)",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    });
    const settle = createTagMutation.mutateAsync(name).then((realTag) => {
      // Swap the optimistic entry for the real one atomically — no refetch gap
      queryClient.setQueryData<Tag[]>(QUERY_KEYS.tags, (old = []) =>
        old.map((t) => (t.id === optimisticId ? realTag : t))
      );
      // Then invalidate in the background to sync any other changes from the server
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      return realTag;
    });
    return { optimisticId, settle };
  };

  const createTag = async (name: string): Promise<Tag> => {
    const tag = await createTagMutation.mutateAsync(name);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    return tag;
  };

  return {
    tags,
    isLoading,
    createTag,
    createTagOptimistic,
    deleteTag: deleteTagMutation.mutateAsync,
    isCreating: createTagMutation.isPending,
    isDeleting: deleteTagMutation.isPending,
  };
};

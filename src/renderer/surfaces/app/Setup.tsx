// First-run Library picker (Obsidian-style). Rendered inline by Home when no
// Library is set, and also reachable at #/setup.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loom } from '../../lib/loom-api';
import { QUERY_KEYS } from '../../lib/query-keys';

export const Setup = () => {
  const queryClient = useQueryClient();
  const [choosing, setChoosing] = useState(false);

  const chooseFolder = async () => {
    setChoosing(true);
    try {
      const result = await loom.chooseLibrary();
      if (result.libraryPath === null) return;
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.library });
    } finally {
      setChoosing(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-neutral-50 p-8 text-neutral-900">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose your loom Library
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          Pick a folder on your Mac to hold every Recording you make. Like an
          Obsidian vault, loom keeps all your files together in one place you own
          — you can point loom at a different folder later.
        </p>
        <button
          type="button"
          onClick={chooseFolder}
          disabled={choosing}
          className="mt-6 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {choosing ? 'Choosing…' : 'Choose folder…'}
        </button>
      </div>
    </div>
  );
};

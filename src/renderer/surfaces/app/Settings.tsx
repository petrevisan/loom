// Settings surface — shows the active Library and lets the user change it.
import { useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { loom } from '../../lib/loom-api';
import { QUERY_KEYS } from '../../lib/query-keys';
import { useLibrary } from '../../hooks/use-loom-queries';

export const Settings = () => {
  const library = useLibrary();
  const queryClient = useQueryClient();
  const [choosing, setChoosing] = useState(false);

  const changeFolder = async () => {
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
    <div className="flex h-full flex-col gap-6 bg-neutral-50 p-8 text-neutral-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <Link
          to="/"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          ← Back
        </Link>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Library</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Where loom saves every Recording.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <code className="flex-1 truncate rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            {library.libraryPath ?? 'No Library selected yet'}
          </code>
          <button
            type="button"
            onClick={changeFolder}
            disabled={choosing}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {choosing ? 'Choosing…' : 'Change…'}
          </button>
        </div>
      </section>
    </div>
  );
};

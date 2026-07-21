export interface RepositorySnapshot {
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  pushedAt: string | null;
}

const fallback: RepositorySnapshot = {
  stars: 0,
  forks: 0,
  openIssues: 0,
  defaultBranch: "main",
  pushedAt: null,
};

export async function getRepositorySnapshot(): Promise<RepositorySnapshot> {
  try {
    const response = await fetch("https://api.github.com/repos/lasder-ca/Nelo", {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "nelo.lattee.jp",
      },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(4_000),
    });

    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      stargazers_count?: number;
      forks_count?: number;
      open_issues_count?: number;
      default_branch?: string;
      pushed_at?: string | null;
    };

    return {
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      defaultBranch: data.default_branch ?? "main",
      pushedAt: data.pushed_at ?? null,
    };
  } catch {
    return fallback;
  }
}

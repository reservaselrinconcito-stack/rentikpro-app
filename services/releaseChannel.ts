const RELEASE_INFO_URL = 'https://rentikpro-updates.reservas-elrinconcito.workers.dev/release.json';
const RELEASE_PAGE_URL = 'https://github.com/reservaselrinconcito-stack/rentikpro-app/releases/latest';

export type ReleaseDownload = {
  name: string;
  url: string;
  size?: number;
  contentType?: string;
};

export type ReleaseInfo = {
  version: string;
  notes?: string;
  pub_date?: string;
  release_url: string;
  downloads: {
    macos_arm64: ReleaseDownload | null;
    macos_x64: ReleaseDownload | null;
    windows_x64: ReleaseDownload | null;
  };
};

let cachedReleaseInfo: Promise<ReleaseInfo | null> | null = null;

export const releaseChannel = {
  async getLatestRelease(): Promise<ReleaseInfo | null> {
    if (!cachedReleaseInfo) {
      cachedReleaseInfo = fetch(RELEASE_INFO_URL, { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Release info ${response.status}`);
          return await response.json() as ReleaseInfo;
        })
        .catch(() => null);
    }

    return await cachedReleaseInfo;
  },

  getReleasePageUrl(): string {
    return RELEASE_PAGE_URL;
  },
};

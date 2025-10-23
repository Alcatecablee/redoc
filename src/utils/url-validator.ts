export interface URLValidationResult {
  isValid: boolean;
  error?: string;
  isReachable?: boolean;
  favicon?: string;
  title?: string;
  statusCode?: number;
}

export async function validateURL(url: string): Promise<URLValidationResult> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const urlObj = new URL(formattedUrl);
    
    if (!urlObj.hostname.includes('.')) {
      return {
        isValid: false,
        error: 'Invalid URL format. Please include a valid domain.'
      };
    }

    try {
      const response = await fetch(`/api/validate/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          isValid: false,
          error: data.error || 'URL validation failed'
        };
      }

      return {
        isValid: true
      };
    } catch (fetchError) {
      return {
        isValid: true,
        error: 'URL format is valid'
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format. Please enter a valid website URL.'
    };
  }
}

export function isValidGitHubRepo(repo: string): boolean {
  if (!repo) return true;
  
  const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
  const githubShortPattern = /^[\w-]+\/[\w.-]+$/;
  
  return githubUrlPattern.test(repo) || githubShortPattern.test(repo);
}

export function formatGitHubRepo(repo: string): string {
  if (!repo) return '';
  
  if (repo.startsWith('http')) {
    return repo;
  }
  
  return `https://github.com/${repo}`;
}

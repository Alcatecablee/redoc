import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const urlValidationSchema = z.object({
  url: z.string().url('Invalid URL format')
});

const githubValidationSchema = z.object({
  repo: z.string().min(1, 'Repository path is required')
});

const isPrivateIP = (hostname: string): boolean => {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  
  if (match) {
    const octets = match.slice(1, 5).map(Number);
    
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 127) return true;
    if (octets[0] === 0) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
  }
  
  const privateHosts = ['localhost', 'localhost.localdomain', '0.0.0.0', '::1', '127.0.0.1'];
  if (privateHosts.includes(hostname.toLowerCase())) return true;
  
  return false;
};

router.post('/url', async (req, res) => {
  try {
    const { url } = urlValidationSchema.parse(req.body);

    try {
      const urlObj = new URL(url);
      
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return res.status(400).json({
          isValid: false,
          error: 'Only HTTP and HTTPS protocols are allowed'
        });
      }
      
      if (!urlObj.hostname.includes('.')) {
        return res.status(400).json({
          isValid: false,
          error: 'Invalid URL format. Please include a valid domain.'
        });
      }

      res.json({
        isValid: true,
        url: url,
        hostname: urlObj.hostname
      });
    } catch (error: any) {
      return res.status(400).json({
        isValid: false,
        error: 'Invalid URL format. Please enter a valid website URL.'
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        isValid: false,
        error: error.errors[0].message
      });
    }

    res.status(500).json({
      isValid: false,
      error: 'Validation failed. Please check your URL and try again.'
    });
  }
});

router.post('/github-repo', async (req, res) => {
  try {
    const { repo } = githubValidationSchema.parse(req.body);

    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    const githubShortPattern = /^[\w-]+\/[\w.-]+$/;

    const isValidFormat = githubUrlPattern.test(repo) || githubShortPattern.test(repo);

    if (!isValidFormat) {
      return res.status(400).json({
        isValid: false,
        error: 'Invalid GitHub repository format. Expected format: "username/repository" or full GitHub URL'
      });
    }

    let repoPath = repo;
    if (repo.startsWith('http')) {
      const match = repo.match(/github\.com\/([\w-]+\/[\w.-]+)/);
      if (match) {
        repoPath = match[1];
      }
    }

    try {
      const apiUrl = `https://api.github.com/repos/${repoPath}`;
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'DocSnap-GitHubValidator/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status === 404) {
        return res.json({
          isValid: true,
          exists: false,
          message: 'Repository format is valid, but the repository does not exist or is private'
        });
      }

      if (response.ok) {
        const repoData = await response.json();
        return res.json({
          isValid: true,
          exists: true,
          name: repoData.name,
          fullName: repoData.full_name,
          description: repoData.description,
          stars: repoData.stargazers_count,
          language: repoData.language
        });
      }

      return res.json({
        isValid: true,
        exists: false,
        message: 'Could not verify repository existence'
      });
    } catch (error) {
      return res.json({
        isValid: true,
        exists: false,
        message: 'Repository format is valid, but verification failed'
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        isValid: false,
        error: error.errors[0].message
      });
    }

    res.status(500).json({
      isValid: false,
      error: 'Validation failed'
    });
  }
});

export default router;

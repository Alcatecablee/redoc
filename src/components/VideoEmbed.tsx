import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Eye, ThumbsUp, Calendar, ExternalLink } from 'lucide-react';

interface VideoEmbedProps {
  video: {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnail: string;
    duration: string;
    views: number;
    likes: number;
    channelTitle: string;
    publishedAt: string;
    summary?: string;
    keyTopics?: string[];
    timestamps?: Array<{time: string, title: string, seconds: number}>;
    analysis?: {
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      category: string;
      actionableInsights: string[];
    };
  };
  showAnalysis?: boolean;
  showTimestamps?: boolean;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({ 
  video, 
  showAnalysis = true, 
  showTimestamps = true 
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold mb-2">
              {video.title}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {formatViews(video.views)} views
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-4 h-4" />
                {video.likes.toLocaleString()} likes
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {video.duration}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(video.publishedAt)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              by <span className="font-medium">{video.channelTitle}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(video.url, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Watch on YouTube
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Video Thumbnail */}
        <div className="relative">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="lg"
              onClick={() => window.open(video.url, '_blank')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ▶️ Watch Video
            </Button>
          </div>
        </div>

        {/* Video Summary */}
        {video.summary && (
          <div>
            <h4 className="font-semibold mb-2">Video Summary</h4>
            <p className="text-sm text-muted-foreground">{video.summary}</p>
          </div>
        )}

        {/* Key Topics */}
        {video.keyTopics && video.keyTopics.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Key Topics</h4>
            <div className="flex flex-wrap gap-2">
              {video.keyTopics.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        {showTimestamps && video.timestamps && video.timestamps.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Video Chapters</h4>
            <div className="space-y-2">
              {video.timestamps.map((timestamp, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                  onClick={() => window.open(`${video.url}&t=${timestamp.seconds}`, '_blank')}
                >
                  <div>
                    <span className="font-mono text-sm text-blue-600">
                      {timestamp.time}
                    </span>
                    <span className="ml-2 text-sm">{timestamp.title}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis */}
        {showAnalysis && video.analysis && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Video Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium mb-2">Difficulty Level</h5>
                <Badge className={getDifficultyColor(video.analysis.difficulty)}>
                  {video.analysis.difficulty}
                </Badge>
              </div>
              <div>
                <h5 className="font-medium mb-2">Category</h5>
                <Badge variant="outline">{video.analysis.category}</Badge>
              </div>
            </div>
            
            {video.analysis.actionableInsights && video.analysis.actionableInsights.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium mb-2">Key Insights</h5>
                <ul className="space-y-1">
                  {video.analysis.actionableInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start">
                      <span className="mr-2">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoEmbed;

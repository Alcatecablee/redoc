import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Eye, ThumbsUp, ExternalLink, Filter } from 'lucide-react';
import { VideoEmbed } from './VideoEmbed';

interface VideoGalleryProps {
  videos: Array<{
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
  }>;
  title?: string;
  showFilters?: boolean;
  maxVideos?: number;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({ 
  videos, 
  title = "Video Tutorials",
  showFilters = true,
  maxVideos = 6
}) => {
  // Validate input data
  if (!videos || !Array.isArray(videos)) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <div className="text-center py-8 text-muted-foreground">
          No videos available
        </div>
      </div>
    );
  }

  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>('all');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  // Get unique difficulties and categories
  const difficulties = ['all', ...Array.from(new Set(videos.map(v => v.analysis?.difficulty).filter(Boolean)))];
  const categories = ['all', ...Array.from(new Set(videos.map(v => v.analysis?.category).filter(Boolean)))];

  // Filter videos
  const filteredVideos = videos
    .filter(video => {
      if (selectedDifficulty !== 'all' && video.analysis?.difficulty !== selectedDifficulty) {
        return false;
      }
      if (selectedCategory !== 'all' && video.analysis?.category !== selectedCategory) {
        return false;
      }
      return true;
    })
    .slice(0, maxVideos);

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
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="text-sm text-muted-foreground">
          {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (difficulties.length > 1 || categories.length > 1) && (
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>
                  {difficulty === 'all' ? 'All Levels' : difficulty}
                </option>
              ))}
            </select>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No videos found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVideos.map((video, index) => (
            <Card key={video.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {video.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {formatViews(video.views)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {video.duration}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(video.url, '_blank')}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Thumbnail */}
                <div className="relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      size="sm"
                      onClick={() => window.open(video.url, '_blank')}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      ▶️
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                {video.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.summary}
                  </p>
                )}

                {/* Key Topics */}
                {video.keyTopics && video.keyTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {video.keyTopics.slice(0, 3).map((topic, topicIndex) => (
                      <Badge key={topicIndex} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                    {video.keyTopics.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{video.keyTopics.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Analysis Tags */}
                {video.analysis && (
                  <div className="flex gap-2">
                    <Badge className={getDifficultyColor(video.analysis.difficulty)}>
                      {video.analysis.difficulty}
                    </Badge>
                    <Badge variant="outline">{video.analysis.category}</Badge>
                  </div>
                )}

                {/* Channel Info */}
                <div className="text-sm text-muted-foreground">
                  by <span className="font-medium">{video.channelTitle}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Show More Button */}
      {videos.length > maxVideos && (
        <div className="text-center mt-6">
          <Button variant="outline">
            View All {videos.length} Videos
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;

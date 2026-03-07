/**
 * SearchResultDisplay Component
 *
 * 美观地展示联网搜索结果
 */

import React from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { SearchResult } from '../../lib/brave-search';

export interface SearchResultDisplayProps {
  results: SearchResult[];
  query: string;
}

export const SearchResultDisplay: React.FC<SearchResultDisplayProps> = ({
  results,
  query,
}) => {
  // Empty state
  if (results.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Search className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">未找到相关结果</p>
          <p className="text-sm text-muted-foreground mt-1">
            搜索关键词: "{query}"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="search-result-display space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Search className="w-4 h-4" />
        <span>
          找到 <strong>{results.length}</strong> 个结果:
          <span className="ml-1 text-foreground">"{query}"</span>
        </span>
      </div>

      {/* Results */}
      {results.map((result, index) => (
        <Card
          key={index}
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => window.open(result.url, '_blank', 'noopener,noreferrer')}
        >
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-start justify-between gap-2">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline flex-1"
              >
                {result.title}
              </a>
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {result.description}
            </p>
            <div className="mt-2 text-xs text-muted-foreground truncate">
              {result.url}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

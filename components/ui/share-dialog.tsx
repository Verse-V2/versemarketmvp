"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Copy, Twitter, Facebook } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  entryTitle: string;
  selections?: Array<{
    id: string;
    marketQuestion: string;
    outcomeName: string;
    odds: string;
    imageUrl?: string;
  }>;
  entry?: {
    entry: number;
    prize: number;
    date: string;
  };
}

// Helper function to format date
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
}

export function ShareDialog({ 
  isOpen, 
  onClose, 
  entryId, 
  entryTitle,
  selections = [],
  entry = { entry: 0, prize: 0, date: new Date().toISOString() }
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  
  // Create a shareable URL
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/entries/${entryId}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleShare = (platform: string) => {
    let shareLink = '';
    const text = `Check out my prediction on ${entryTitle} on Verse Market!`;
    
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      default:
        return;
    }
    
    window.open(shareLink, '_blank');
  };

  // Determine text sizes based on number of selections
  const getTextSizes = (count: number) => {
    if (count <= 2) {
      return {
        question: "text-sm",
        outcome: "text-sm",
        circleSize: "w-4 h-4",
        imageSize: "w-6 h-6",
        py: "py-3",
        spacing: "space-y-1"
      };
    } else if (count <= 4) {
      return {
        question: "text-xs",
        outcome: "text-xs",
        circleSize: "w-3 h-3",
        imageSize: "w-5 h-5",
        py: "py-2",
        spacing: "space-y-0.5"
      };
    } else {
      return {
        question: "text-xs",
        outcome: "text-xs",
        circleSize: "w-2.5 h-2.5",
        imageSize: "w-4 h-4",
        py: "py-1.5",
        spacing: "space-y-0"
      };
    }
  };

  const textSizes = getTextSizes(selections.length);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-[#18181B] rounded-xl">
        <div className="relative w-full h-1 flex justify-center mt-4">
          <div className="w-12 h-1 rounded-full bg-gray-600" />
        </div>
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-300 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="px-6 pt-8 pb-6">
          <DialogTitle className="text-2xl font-semibold text-center mb-6">
            Share Entry
          </DialogTitle>
          
          {/* Receipt-like Entry Visualization */}
          <div className="mb-8 bg-[#131415] rounded-xl overflow-hidden mx-auto relative
                          shadow-[0_0_15px_rgba(0,0,0,0.2)] max-w-[95%]
                          before:content-[''] before:absolute before:w-full before:h-8 before:top-0 before:left-0
                          before:bg-[url('data:image/svg+xml;charset=utf-8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%228%22><path d=%22M 0,4 C 4,0 8,8 16,2 L 16,0 L 0,0 Z%22 fill=%22%2318181B%22 /></svg>')]
                          before:bg-repeat-x before:z-10
                          after:content-[''] after:absolute after:w-full after:h-8 after:bottom-0 after:left-0
                          after:bg-[url('data:image/svg+xml;charset=utf-8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%228%22><path d=%22M 0,4 C 4,8 8,0 16,6 L 16,8 L 0,8 Z%22 fill=%22%2318181B%22 /></svg>')]
                          after:bg-repeat-x after:z-10">
            {/* Subtle paper texture overlay */}
            <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none" style={{
              backgroundImage: 'url("data:image/png;base64,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")'
            }}></div>
            
            {/* Perforated edge styling at the top */}
            <div className="relative pt-10">
              <div className="absolute top-0 left-0 right-0 h-[12px] overflow-hidden">
                <div className="absolute top-[-5px] left-0 right-0 h-[12px] flex">
                  {[...Array(18)].map((_, i) => (
                    <div key={i} className="h-full w-[12px] mx-[3px] rounded-full bg-[#18181B]"></div>
                  ))}
                </div>
              </div>
              
              {/* Zigzag edge - more pronounced */}
              <div className="absolute top-[10px] left-0 right-0 h-[10px] overflow-hidden">
                <svg viewBox="0 0 120 12" className="w-full h-full">
                  <path 
                    d="M0,0 L10,8 L20,0 L30,8 L40,0 L50,8 L60,0 L70,8 L80,0 L90,8 L100,0 L110,8 L120,0 L120,12 L0,12 Z" 
                    fill="#131415"
                  />
                </svg>
              </div>
            </div>

            {/* Header */}
            <div className="px-4 py-2 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold m-0">
                      {entryTitle}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400 uppercase">PREDICTION</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1">
                <Image
                  src="/verse-coin.png"
                  alt="Verse Coin"
                  width={20}
                  height={20}
                  className="object-contain"
                />
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <span>WAGER</span>
                  <span className="text-white">${entry.entry.toFixed(2)}</span>
                  <span>•</span>
                  <span>TO PAY</span>
                  <span className="text-white">${entry.prize.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* All Selections */}
            <div className="border-t border-[#2A2A2D] max-h-60 overflow-y-auto">
              {selections.map((selection, index) => (
                <div 
                  key={selection.id}
                  className={`px-4 ${textSizes.py} border-b border-[#2A2A2D] last:border-b-0 relative`}
                >
                  {/* Dotted line connecting legs */}
                  {index < selections.length - 1 && (
                    <div 
                      className="absolute left-[0.75rem] top-[1.1rem] bottom-0 w-[1px] border-l border-dotted border-gray-600"
                      style={{ 
                        height: selections.length <= 2 ? 'calc(100% - 0.75rem)' : 
                               selections.length <= 4 ? 'calc(100% - 0.5rem)' : 
                               'calc(100% - 0.25rem)' 
                      }}
                    />
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className={`${textSizes.spacing}`}>
                      <div className="flex items-center gap-2">
                        <div className={`${textSizes.circleSize} rounded-full border-2 border-gray-600 shrink-0 mt-0.5`} />
                        <p className={`${textSizes.question} text-gray-400 truncate max-w-[180px] leading-tight`}>
                          {selection.marketQuestion.split(' - ')[0]}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between pl-5">
                        <div className="flex items-center gap-2">
                          {selection.imageUrl && (
                            <div className={`relative ${textSizes.imageSize} rounded-full overflow-hidden bg-[#2A2A2D] shrink-0`}>
                              <Image
                                src={selection.imageUrl}
                                alt={selection.marketQuestion}
                                fill
                                sizes="24px"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <span className={`${textSizes.outcome} truncate max-w-[120px]`}>{selection.outcomeName}</span>
                        </div>
                        <span className={`${textSizes.outcome} font-semibold ml-2`}>{selection.odds}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-[#1C1D1E] px-4 py-1.5 border-t border-[#2A2A2D] flex items-center justify-between relative pb-8">
              <div className="text-xs text-gray-400">
                <span>ID: {entryId}</span>
                <span className="mx-2">•</span>
                <span>{formatDate(entry.date)}</span>
              </div>
              <div className="px-2 py-1 bg-[#0BC700]/20 rounded-full text-[#0BC700] text-xs font-medium">
                Shared
              </div>
              
              {/* Perforated edge styling at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-[12px] overflow-hidden">
                <div className="absolute bottom-[-5px] left-0 right-0 h-[12px] flex">
                  {[...Array(18)].map((_, i) => (
                    <div key={i} className="h-full w-[12px] mx-[3px] rounded-full bg-[#18181B]"></div>
                  ))}
                </div>
              </div>
              
              {/* Zigzag edge - more pronounced */}
              <div className="absolute bottom-[10px] left-0 right-0 h-[10px] overflow-hidden">
                <svg viewBox="0 0 120 12" className="w-full h-full rotate-180">
                  <path 
                    d="M0,0 L10,8 L20,0 L30,8 L40,0 L50,8 L60,0 L70,8 L80,0 L90,8 L100,0 L110,8 L120,0 L120,12 L0,12 Z" 
                    fill="#1C1D1E"
                  />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Share Links */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => handleShare('twitter')}
              className="bg-[#27272A] hover:bg-[#323235] text-white rounded-xl py-4 h-auto flex items-center justify-center gap-3"
            >
              <Twitter className="h-5 w-5 text-[#1DA1F2]" />
              <span>Twitter</span>
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => handleShare('facebook')}
              className="bg-[#27272A] hover:bg-[#323235] text-white rounded-xl py-4 h-auto flex items-center justify-center gap-3"
            >
              <Facebook className="h-5 w-5 text-[#1877F2]" />
              <span>Facebook</span>
            </Button>

            <Button
              variant="ghost"
              onClick={handleCopyLink}
              className={`bg-[#27272A] hover:bg-[#323235] text-white rounded-xl py-4 h-auto flex items-center justify-center gap-3 
                ${copied ? 'bg-[#0BC700]/20 text-[#0BC700] hover:bg-[#0BC700]/20' : ''}`}
            >
              <Copy className="h-5 w-5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>

          <Button
            className="w-full bg-[#0BC700] hover:bg-[#0AB100] text-white rounded-xl py-4 h-auto text-base font-semibold"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
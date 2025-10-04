/**
 * Preview Drawer Component
 * Slide-over drawer showing detailed column preview and statistics
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import { Column } from '../schemas';
import { TypeBadge } from './TypeBadge';

interface PreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  column: Column | null;
}

export function PreviewDrawer({ isOpen, onClose, column }: PreviewDrawerProps) {
  if (!column) return null;

  const uniqueValues = [...new Set(column.sample.filter(Boolean))];
  const emptyCount = column.sample.filter(val => !val || val.trim() === '').length;
  const emptyPercentage = Math.round((emptyCount / column.sample.length) * 100);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>Column {column.index + 1}</span>
            {column.header && (
              <Badge variant="outline">{column.header}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Preview of sample values and column statistics
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Detected Type</h4>
              <TypeBadge type={column.inferredType} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Sample Size</h4>
              <Badge variant="secondary">{column.sample.length} rows</Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Unique values: {uniqueValues.length}</div>
              <div>Empty: {emptyPercentage}%</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Sample Values</h4>
            <ScrollArea className="h-[300px] w-full rounded-md border p-3">
              <div className="space-y-2">
                <AnimatePresence>
                  {column.sample.map((value, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-xs text-muted-foreground">
                        Row {index + 1}:
                      </span>
                      <span className="text-sm font-mono max-w-[200px] truncate">
                        {value || <em className="text-muted-foreground">empty</em>}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {uniqueValues.length > 0 && uniqueValues.length <= 10 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Unique Values</h4>
                <div className="flex flex-wrap gap-1">
                  {uniqueValues.map((value, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs font-mono"
                    >
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

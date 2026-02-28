/**
 * usePagination - Custom hook for pagination
 * Manages page state, size, and calculation
 */

import { useState, useCallback, useMemo } from 'react';
import { API_CONFIG } from '../config';

export const usePagination = (items = [], initialPageSize = API_CONFIG.PAGE_SIZE) => {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Calculate pagination info
   */
  const paginationInfo = useMemo(() => {
    const total = items.length;
    const pageCount = Math.ceil(total / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const currentItems = items.slice(startIndex, endIndex);
    const hasPrevPage = currentPage > 1;
    const hasNextPage = currentPage < pageCount;

    return {
      total,
      pageCount,
      pageSize,
      currentPage,
      startIndex: total > 0 ? startIndex + 1 : 0,
      endIndex,
      currentItems,
      hasPrevPage,
      hasNextPage,
      itemsShowing: endIndex - startIndex,
    };
  }, [items, pageSize, currentPage]);

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    setCurrentPage((prev) => {
      const next = prev + 1;
      return next <= paginationInfo.pageCount ? next : prev;
    });
  }, [paginationInfo.pageCount]);

  /**
   * Go to previous page
   */
  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  /**
   * Go to specific page
   */
  const goToPage = useCallback(
    (page) => {
      const pageNum = Math.max(1, Math.min(page, paginationInfo.pageCount));
      setCurrentPage(pageNum);
    },
    [paginationInfo.pageCount]
  );

  /**
   * Change page size
   */
  const changePageSize = useCallback((size) => {
    setPageSize(Math.max(1, size));
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Reset pagination
   */
  const reset = useCallback(() => {
    setCurrentPage(1);
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  return {
    ...paginationInfo,
    nextPage,
    prevPage,
    goToPage,
    changePageSize,
    reset,
    setPageSize,
    setCurrentPage,
  };
};

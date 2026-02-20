/**
 * DSA Problems Database
 * Extracted from comprehensive DSA checklist with 200+ problems
 * Organized by topic with difficulty levels and metadata
 */

export const DSA_SECTIONS = [
  {
    id: 'sorting-arrays-i',
    name: 'Sorting & Arrays I',
    category: 'Arrays',
    description: 'Fundamental sorting algorithms and array manipulation',
    problems: [
      {
        id: 'merge-sort',
        title: 'Merge Sorting',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Divide & Conquer',
        description: 'Merge sort is a divide-and-conquer sorting algorithm that divides an array into two halves, recursively sorts them, and then merges the sorted halves back together. It is a stable and efficient sorting algorithm.',
        solution: {
          approach: 'Divide and Conquer - Recursively divide the array in half, sort each half, then merge them back together.',
          keyPoints: [
            'Divide the array into two halves',
            'Recursively sort the left and right halves',
            'Merge the two sorted halves',
            'Maintain two pointers to compare elements from both halves'
          ],
          code: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  
  return result.concat(left.slice(i)).concat(right.slice(j));
}`,
          complexity: {
            time: 'O(n log n)',
            space: 'O(n)',
            description: 'Time: O(n log n) for all cases (best, average, worst). Space: O(n) for temporary arrays during merging.'
          },
          tradeoffs: [
            'Stable sort (maintains relative order of equal elements)',
            'Requires extra space for merging - not in-place',
            'Good for linked lists and external sorting',
            'Consistent O(n log n) performance'
          ]
        }
      },
      {
        id: 'quick-sort',
        title: 'Quick Sorting',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Divide & Conquer',
        description: 'Quick sort is an in-place divide-and-conquer sorting algorithm that works by selecting a pivot element and partitioning the array around it. It is highly efficient for most practical purposes.',
        solution: {
          approach: 'Select a pivot, partition array into elements less than and greater than pivot, then recursively sort both partitions.',
          keyPoints: [
            'Choose a pivot element from the array',
            'Partition array so elements < pivot are on left, elements > pivot are on right',
            'Recursively apply quick sort to left and right partitions',
            'In-place sorting with no additional array needed'
          ],
          code: `function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pi = partition(arr, low, high);
    quickSort(arr, low, pi - 1);
    quickSort(arr, pi + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  
  for (let j = low; j < high; j++) {
    if (arr[j] < pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}`,
          complexity: {
            time: 'O(n log n) average, O(n²) worst case',
            space: 'O(log n)',
            description: 'Time: O(n log n) on average, O(n²) in worst case (when pivot is always smallest/largest). Space: O(log n) for recursion stack.'
          },
          tradeoffs: [
            'In-place sorting - space efficient',
            'Not stable - may change relative order of equal elements',
            'Fastest general-purpose sorting algorithm in practice',
            'Worst-case O(n²) can occur with bad pivot selection'
          ]
        }
      },
      {
        id: 'longest-consecutive',
        title: 'Longest Consecutive Sequence in an Array',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Hashing'
      },
      {
        id: 'spiral-matrix',
        title: 'Print the matrix in spiral manner',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Matrix Traversal'
      },
      {
        id: 'kadane-algorithm',
        title: "Kadane's Algorithm",
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Dynamic Programming'
      }
    ]
  },
  {
    id: 'arrays-ii',
    name: 'Arrays II',
    category: 'Arrays',
    description: 'Advanced array problems and multi-pointer techniques',
    problems: [
      {
        id: 'pascals-triangle',
        title: "Pascal's Triangle III",
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Number Theory'
      },
      {
        id: 'rotate-matrix',
        title: 'Rotate matrix by 90 degrees',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Matrix Manipulation'
      },
      {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Hashing',
        description: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to the target. You may assume each input has exactly one solution, and you cannot use the same element twice.',
        solution: {
          approach: 'Use a hash map to store values we have seen and their indices. For each number, check if (target - number) exists in the map.',
          keyPoints: [
            'Use a hash map to store value and its index',
            'For each number, check if complement (target - current) exists in map',
            'If found, return indices; otherwise add current number to map',
            'Single pass through array for O(n) solution'
          ],
          code: `function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
  }
  
  return []; // No solution found
}

// Example: twoSum([2, 7, 11, 15], 9) => [0, 1]`,
          complexity: {
            time: 'O(n)',
            space: 'O(n)',
            description: 'Time: O(n) - single pass through array. Space: O(n) - hash map can store up to n elements.'
          },
          tradeoffs: [
            'Hash map approach is optimal for single pass',
            'Two pointer approach works on sorted array with O(1) space',
            'Hash map provides O(1) lookup time',
            'Trade-off: Space for time efficiency'
          ]
        },
        testCases: [
          {
            input: [[2, 7, 11, 15], 9],
            expected: [0, 1]
          },
          {
            input: [[3, 2, 4], 6],
            expected: [1, 2]
          },
          {
            input: [[3, 3], 6],
            expected: [0, 1]
          }
        ]
      },
      {
        id: 'three-sum',
        title: '3 Sum',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Two Pointers'
      },
      {
        id: 'four-sum',
        title: '4 Sum',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Two Pointers'
      }
    ]
  },
  {
    id: 'arrays-iii',
    name: 'Arrays III',
    category: 'Arrays',
    description: 'Majority elements, missing numbers, and counting problems',
    problems: [
      {
        id: 'majority-element-i',
        title: 'Majority Element-I',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Boyer-Moore Voting'
      },
      {
        id: 'majority-element-ii',
        title: 'Majority Element-II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Boyer-Moore Voting'
      },
      {
        id: 'repeating-missing',
        title: 'Find the repeating and missing number',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Hashing'
      },
      {
        id: 'count-inversions',
        title: 'Count Inversions',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Merge Sort'
      },
      {
        id: 'reverse-pairs',
        title: 'Reverse Pairs',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Merge Sort'
      }
    ]
  },
  {
    id: 'arrays-iv-hashing',
    name: 'Arrays IV & Hashing',
    category: 'Arrays',
    description: 'Subarray problems and hashing techniques',
    problems: [
      {
        id: 'max-product-subarray',
        title: 'Maximum Product Subarray in an Array',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Dynamic Programming'
      },
      {
        id: 'merge-sorted-arrays',
        title: 'Merge two sorted arrays without extra space',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Two Pointers'
      },
      {
        id: 'longest-subarray-sum-k',
        title: 'Longest subarray with sum K',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Prefix Sum'
      },
      {
        id: 'count-subarrays-sum-k',
        title: 'Count subarrays with given sum',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Hashing'
      },
      {
        id: 'count-subarrays-xor-k',
        title: 'Count subarrays with given xor K',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'XOR'
      }
    ]
  },
  {
    id: 'binary-search-i',
    name: 'Binary Search I',
    category: 'Binary Search',
    description: 'Fundamentals of binary search and boundary problems',
    problems: [
      {
        id: 'lower-bound',
        title: 'Lower Bound',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      },
      {
        id: 'upper-bound',
        title: 'Upper Bound',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      },
      {
        id: 'search-rotated-array-ii',
        title: 'Search in rotated sorted array-II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      },
      {
        id: 'min-rotated-array',
        title: 'Find minimum in Rotated Sorted Array',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      },
      {
        id: 'smallest-divisor',
        title: 'Find the smallest divisor',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      }
    ]
  },
  {
    id: 'binary-search-ii',
    name: 'Binary Search II',
    category: 'Binary Search',
    description: 'Advanced binary search on answers and allocation problems',
    problems: [
      {
        id: 'koko-eating-bananas',
        title: 'Koko eating bananas',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search on Answer'
      },
      {
        id: 'min-days-bouquets',
        title: 'Minimum days to make M bouquets',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search on Answer'
      },
      {
        id: 'aggressive-cows',
        title: 'Aggressive Cows',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search on Answer'
      },
      {
        id: 'book-allocation',
        title: 'Book Allocation Problem',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search on Answer'
      },
      {
        id: 'median-2-arrays',
        title: 'Median of 2 sorted arrays',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      }
    ]
  },
  {
    id: 'binary-search-iii',
    name: 'Binary Search III',
    category: 'Binary Search',
    description: '2D matrix and advanced binary search problems',
    problems: [
      {
        id: 'max-ones-row',
        title: 'Find row with maximum 1\'s',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      },
      {
        id: 'search-2d-matrix',
        title: 'Search in a 2D matrix',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      },
      {
        id: 'search-2d-matrix-ii',
        title: 'Search in 2D matrix - II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      },
      {
        id: 'peak-element',
        title: 'Find peak element',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      },
      {
        id: 'matrix-median',
        title: 'Matrix Median',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Binary Search'
      }
    ]
  },
  {
    id: 'recursion-i',
    name: 'Recursion I',
    category: 'Recursion & Backtracking',
    description: 'Basic recursion and subset/combination generation',
    problems: [
      {
        id: 'power-set',
        title: 'Power Set',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      },
      {
        id: 'subsequence-sum-k',
        title: 'Check if there exists a subsequence with sum K',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Recursion'
      },
      {
        id: 'combination-sum',
        title: 'Combination Sum',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      },
      {
        id: 'combination-sum-ii',
        title: 'Combination Sum II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      },
      {
        id: 'combination-sum-iii',
        title: 'Combination Sum III',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      }
    ]
  },
  {
    id: 'recursion-ii',
    name: 'Recursion II',
    category: 'Recursion & Backtracking',
    description: 'Advanced backtracking and constraint satisfaction',
    problems: [
      {
        id: 'palindrome-partitioning',
        title: 'Palindrome partitioning',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      },
      {
        id: 'n-queen',
        title: 'N Queen',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      },
      {
        id: 'rat-in-maze',
        title: 'Rat in a Maze',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      },
      {
        id: 'm-coloring',
        title: 'M Coloring Problem',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      },
      {
        id: 'sudoku-solver',
        title: 'Sudoku Solver',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Backtracking'
      }
    ]
  },
  {
    id: 'linked-list-i',
    name: 'Linked List I',
    category: 'Linked Lists',
    description: 'Basic linked list operations and traversals',
    problems: [
      {
        id: 'll-segregate-odd-even',
        title: 'Segregate odd and even nodes in Linked List',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Linked List'
      },
      {
        id: 'll-sort-012',
        title: "Sort a Linked List of 0's 1's and 2's",
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Linked List'
      },
      {
        id: 'll-intersection-point',
        title: 'Find the intersection point of Y LL',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Linked List'
      },
      {
        id: 'll-reverse',
        title: 'Reverse a LL',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Linked List'
      },
      {
        id: 'll-palindrome',
        title: 'Check if LL is palindrome or not',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Linked List'
      }
    ]
  },
  {
    id: 'linked-list-ii',
    name: 'Linked List II',
    category: 'Linked Lists',
    description: 'Cycle detection, flattening, and advanced operations',
    problems: [
      {
        id: 'll-cycle-start',
        title: 'Find the starting point in LL',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Cycle Detection'
      },
      {
        id: 'll-cycle-length',
        title: 'Length of loop in LL',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Cycle Detection'
      },
      {
        id: 'll-reverse-groups',
        title: 'Reverse LL in group of given size K',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Linked List'
      },
      {
        id: 'll-flattening',
        title: 'Flattening of LL',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Linked List'
      },
      {
        id: 'll-sort',
        title: 'Sort LL',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Merge Sort'
      }
    ]
  },
  {
    id: 'linked-list-iii-bit',
    name: 'Linked List III & Bit Manipulation',
    category: 'Linked Lists',
    description: 'Complex LL operations and bit manipulation',
    problems: [
      {
        id: 'll-clone-random',
        title: 'Clone a LL with random and next pointer',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Hashing'
      },
      {
        id: 'll-delete-middle',
        title: 'Delete the middle node in LL',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Linked List'
      },
      {
        id: 'single-number-ii',
        title: 'Single Number - II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Bit Manipulation'
      },
      {
        id: 'single-number-iii',
        title: 'Single Number - III',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Bit Manipulation'
      },
      {
        id: 'xor-range',
        title: 'XOR of numbers in a given range',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Bit Manipulation'
      }
    ]
  },
  {
    id: 'greedy-algorithms',
    name: 'Greedy Algorithms',
    category: 'Greedy',
    description: 'Greedy approach to optimization problems',
    problems: [
      {
        id: 'greedy-meetings',
        title: 'N meetings in one room',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Greedy'
      },
      {
        id: 'greedy-intervals',
        title: 'Non-overlapping Intervals',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Greedy'
      },
      {
        id: 'greedy-platforms',
        title: 'Minimum number of platforms required for a railway',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Greedy'
      },
      {
        id: 'valid-parenthesis',
        title: 'Valid Paranthesis Checker',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Stack'
      },
      {
        id: 'greedy-candy',
        title: 'Candy',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Greedy'
      }
    ]
  },
  {
    id: 'sliding-window-i',
    name: 'Sliding Window I',
    category: 'Sliding Window',
    description: 'Substring and character window problems',
    problems: [
      {
        id: 'sliding-no-repeat',
        title: 'Longest Substring Without Repeating Characters',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      },
      {
        id: 'sliding-ones-iii',
        title: 'Max Consecutive Ones III',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      },
      {
        id: 'sliding-k-distinct',
        title: 'Longest Substring With At Most K Distinct Characters',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      },
      {
        id: 'sliding-char-replacement',
        title: 'Longest Repeating Character Replacement',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      },
      {
        id: 'fruit-baskets',
        title: 'Fruit Into Baskets',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      }
    ]
  },
  {
    id: 'sliding-window-ii',
    name: 'Sliding Window II',
    category: 'Sliding Window',
    description: 'Advanced sliding window with specific constraints',
    problems: [
      {
        id: 'sliding-points-cards',
        title: 'Maximum Points You Can Obtain from Cards',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      },
      {
        id: 'sliding-min-window',
        title: 'Minimum Window Substring',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      },
      {
        id: 'sliding-three-chars',
        title: 'Number of Substrings Containing All Three Characters',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      },
      {
        id: 'sliding-binary-sum',
        title: 'Binary Subarrays With Sum',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      },
      {
        id: 'sliding-nice-subarrays',
        title: 'Count number of Nice subarrays',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sliding Window'
      }
    ]
  },
  {
    id: 'stack-queue-i',
    name: 'Stack and Queue I',
    category: 'Stack & Queue',
    description: 'Stack-based problems and monotonic stacks',
    problems: [
      {
        id: 'stack-next-greater-ii',
        title: 'Next Greater Element - 2',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Monotonic Stack'
      },
      {
        id: 'stack-asteroid-collision',
        title: 'Asteroid Collision',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Stack'
      },
      {
        id: 'stack-sum-minimums',
        title: 'Sum of Subarray Minimums',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Monotonic Stack'
      },
      {
        id: 'stack-sum-ranges',
        title: 'Sum of Subarray Ranges',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Monotonic Stack'
      },
      {
        id: 'stack-remove-k-digits',
        title: 'Remove K Digits',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Greedy'
      }
    ]
  },
  {
    id: 'stack-queue-ii',
    name: 'Stack and Queue II',
    category: 'Stack & Queue',
    description: 'Queue problems, sliding window maximum, and LRU cache',
    problems: [
      {
        id: 'stack-min-stack',
        title: 'Implement Min Stack',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Stack'
      },
      {
        id: 'queue-sliding-max',
        title: 'Sliding Window Maximum',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Deque'
      },
      {
        id: 'stack-trapping-water',
        title: 'Trapping Rainwater',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Two Pointers'
      },
      {
        id: 'stack-largest-rectangle',
        title: 'Largest rectangle in a histogram',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Monotonic Stack'
      },
      {
        id: 'queue-lru-cache',
        title: 'LRU Cache',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Design'
      }
    ]
  },
  {
    id: 'heaps',
    name: 'Heaps',
    category: 'Heaps & Priority Queue',
    description: 'Heap operations and priority queue applications',
    problems: [
      {
        id: 'heap-sort',
        title: 'Heap Sort',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sorting'
      },
      {
        id: 'heap-kth-largest',
        title: 'K-th Largest element in an array',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Heap'
      },
      {
        id: 'heap-kth-stream',
        title: 'Kth largest element in a stream of running integers',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Heap'
      }
    ]
  },
  {
    id: 'binary-tree-i',
    name: 'Binary Tree I',
    category: 'Trees',
    description: 'Tree traversals and basic tree operations',
    problems: [
      {
        id: 'tree-preorder',
        title: 'Preorder Traversal',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Traversal'
      },
      {
        id: 'tree-inorder',
        title: 'Inorder Traversal',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Traversal'
      },
      {
        id: 'tree-postorder',
        title: 'Postorder Traversal',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Traversal'
      },
      {
        id: 'tree-level-order',
        title: 'Level Order Traversal',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      },
      {
        id: 'tree-max-depth',
        title: 'Maximum Depth in BT',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      }
    ]
  },
  {
    id: 'binary-tree-ii',
    name: 'Binary Tree II',
    category: 'Trees',
    description: 'Diameter, path sum, and symmetry problems',
    problems: [
      {
        id: 'tree-diameter',
        title: 'Diameter of Binary Tree',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'tree-max-path-sum',
        title: 'Maximum path sum',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'tree-symmetric',
        title: 'Check for symmetrical BTs',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'tree-boundary',
        title: 'Boundary Traversal',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Traversal'
      },
      {
        id: 'tree-vertical-order',
        title: 'Vertical Order Traversal',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      }
    ]
  },
  {
    id: 'binary-tree-iii',
    name: 'Binary Tree III',
    category: 'Trees',
    description: 'Tree views, paths, and LCA problems',
    problems: [
      {
        id: 'tree-top-view',
        title: 'Top View of BT',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      },
      {
        id: 'tree-side-view',
        title: 'Right/Left View of BT',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      },
      {
        id: 'tree-root-to-node',
        title: 'Print root to node path in BT',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'tree-lca',
        title: 'LCA in BT',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'tree-max-width',
        title: 'Maximum Width of BT',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      }
    ]
  },
  {
    id: 'binary-tree-iv',
    name: 'Binary Tree IV',
    category: 'Trees',
    description: 'Tree construction and serialization problems',
    problems: [
      {
        id: 'tree-burn-time',
        title: 'Minimum time taken to burn the BT from a given Node',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      },
      {
        id: 'tree-count-complete',
        title: 'Count total nodes in a complete BT',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'tree-construct-pre-in',
        title: 'Construct a BT from Preorder and Inorder',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Construction'
      },
      {
        id: 'tree-construct-post-in',
        title: 'Construct a BT from Postorder and Inorder',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Construction'
      },
      {
        id: 'tree-serialize',
        title: 'Serialize and De-serialize BT',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Traversal'
      }
    ]
  },
  {
    id: 'binary-tree-v-bst-i',
    name: 'Binary Tree V and BST I',
    category: 'Trees',
    description: 'Morris traversal and BST operations',
    problems: [
      {
        id: 'tree-morris-inorder',
        title: 'Morris Inorder Traversal',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Traversal'
      },
      {
        id: 'tree-morris-preorder',
        title: 'Morris Preorder Traversal',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Tree Traversal'
      },
      {
        id: 'bst-lca',
        title: 'LCA in BST',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BST'
      },
      {
        id: 'bst-kth-element',
        title: 'Kth Smallest and Largest element in BST',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BST'
      },
      {
        id: 'bst-from-preorder',
        title: 'Construct a BST from a preorder traversal',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BST'
      }
    ]
  },
  {
    id: 'binary-search-tree-ii',
    name: 'Binary Search Tree II',
    category: 'Trees',
    description: 'Advanced BST problems and variants',
    problems: [
      {
        id: 'bst-iterator',
        title: 'BST iterator',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Design'
      },
      {
        id: 'bst-succ-pred',
        title: 'Inorder successor and predecessor in BST',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BST'
      },
      {
        id: 'bst-two-sum',
        title: 'Two sum in BST',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BST'
      },
      {
        id: 'bst-fix-swapped',
        title: 'Correct BST with two nodes swapped',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BST'
      },
      {
        id: 'bst-largest-in-tree',
        title: 'Largest BST in Binary Tree',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BST'
      }
    ]
  },
  {
    id: 'graph-i',
    name: 'Graph I',
    category: 'Graphs',
    description: 'Basic graph traversal and connected components',
    problems: [
      {
        id: 'graph-traversal',
        title: 'Traversal Techniques',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS/DFS'
      },
      {
        id: 'graph-num-islands',
        title: 'Number of islands',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS/BFS'
      },
      {
        id: 'graph-flood-fill',
        title: 'Flood fill algorithm',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'graph-rotten-oranges',
        title: 'Rotten Oranges',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      },
      {
        id: 'graph-surrounded-regions',
        title: 'Surrounded Regions',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      }
    ]
  },
  {
    id: 'graph-ii',
    name: 'Graph II',
    category: 'Graphs',
    description: 'Island variants, bipartite checking, and cycle detection',
    problems: [
      {
        id: 'graph-distinct-islands',
        title: 'Number of distinct islands',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'graph-bipartite',
        title: 'Bipartite graph',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      },
      {
        id: 'graph-topo-sort',
        title: "Topological sort or Kahn's algorithm",
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Topological Sort'
      },
      {
        id: 'graph-cycle-directed',
        title: 'Detect a cycle in a directed graph',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Cycle Detection'
      },
      {
        id: 'graph-safe-states',
        title: 'Find eventual safe states',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      }
    ]
  },
  {
    id: 'graph-iii',
    name: 'Graph III',
    category: 'Graphs',
    description: 'Course scheduling and DAG shortest path',
    problems: [
      {
        id: 'graph-course-i',
        title: 'Course Schedule I',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Topological Sort'
      },
      {
        id: 'graph-course-ii',
        title: 'Course Schedule II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Topological Sort'
      },
      {
        id: 'graph-alien-dict',
        title: 'Alien Dictionary',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Topological Sort'
      },
      {
        id: 'graph-shortest-dag',
        title: 'Shortest path in DAG',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'graph-shortest-unit',
        title: 'Shortest path in undirected graph with unit weights',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      }
    ]
  },
  {
    id: 'graph-iv',
    name: 'Graph IV',
    category: 'Graphs',
    description: 'Word ladder and Dijkstra shortest path',
    problems: [
      {
        id: 'graph-word-ladder-i',
        title: 'Word ladder I',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      },
      {
        id: 'graph-word-ladder-ii',
        title: 'Word ladder II',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'BFS'
      },
      {
        id: 'graph-dijkstra',
        title: "Dijkstra's algorithm",
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Shortest Path'
      },
      {
        id: 'graph-min-effort',
        title: 'Path with minimum effort',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Dijkstra'
      },
      {
        id: 'graph-cheapest-flight',
        title: 'Cheapest flight within K stops',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Bellman-Ford'
      }
    ]
  },
  {
    id: 'graph-v',
    name: 'Graph V',
    category: 'Graphs',
    description: 'All pairs shortest path and MST',
    problems: [
      {
        id: 'graph-ways-destination',
        title: 'Number of ways to arrive at destination',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Dijkstra'
      },
      {
        id: 'graph-bellman-ford',
        title: 'Bellman ford algorithm',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Shortest Path'
      },
      {
        id: 'graph-floyd-warshall',
        title: 'Floyd warshall algorithm',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Shortest Path'
      },
      {
        id: 'graph-city-neighbors',
        title: 'Find the city with the smallest number of neighbors',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Floyd-Warshall'
      },
      {
        id: 'graph-disjoint-set',
        title: 'Disjoint Set',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Union-Find'
      }
    ]
  },
  {
    id: 'graph-vi',
    name: 'Graph VI',
    category: 'Graphs',
    description: 'MST and advanced graph algorithms',
    problems: [
      {
        id: 'graph-mst-weight',
        title: 'Find the MST weight',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'MST'
      },
      {
        id: 'graph-network-connected',
        title: 'Number of operations to make network connected',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Union-Find'
      },
      {
        id: 'graph-islands-ii',
        title: 'Number of islands II',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Union-Find'
      },
      {
        id: 'graph-making-large-island',
        title: 'Making a large island',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Union-Find'
      },
      {
        id: 'graph-kosaraju',
        title: "Kosaraju's algorithm",
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'SCC'
      }
    ]
  },
  {
    id: 'graph-vii-maths',
    name: 'Graph VII and Maths',
    category: 'Graphs',
    description: 'Bridges, articulation points, and number theory',
    problems: [
      {
        id: 'graph-bridges',
        title: 'Bridges in graph',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'graph-articulation',
        title: 'Articulation point in graph',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DFS'
      },
      {
        id: 'maths-primes-n',
        title: 'Print all primes till N',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sieve'
      },
      {
        id: 'maths-prime-factors',
        title: 'Prime factorisation of a Number',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Number Theory'
      },
      {
        id: 'maths-count-primes',
        title: 'Count primes in range L to R',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Sieve'
      }
    ]
  },
  {
    id: 'dynamic-programming-i',
    name: 'Dynamic Programming I',
    category: 'Dynamic Programming',
    description: 'Basic DP problems and state transitions',
    problems: [
      {
        id: 'dp-climbing-stairs',
        title: 'Climbing stairs',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-frog-jump',
        title: 'Frog jump with K distances',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-max-non-adjacent',
        title: 'Maximum sum of non adjacent elements',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-house-robber',
        title: 'House robber',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-ninja-training',
        title: "Ninja's training",
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      }
    ]
  },
  {
    id: 'dynamic-programming-ii',
    name: 'Dynamic Programming II',
    category: 'Dynamic Programming',
    description: '2D DP and grid problems',
    problems: [
      {
        id: 'dp-grid-paths',
        title: 'Grid unique paths',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-grid-obstacles',
        title: 'Unique paths II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-falling-path',
        title: 'Minimum Falling Path Sum',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-triangle',
        title: 'Triangle',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-cherry-pickup',
        title: 'Cherry pickup II',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      }
    ]
  },
  {
    id: 'dynamic-programming-iii',
    name: 'Dynamic Programming III',
    category: 'Dynamic Programming',
    description: 'Stock trading problems',
    problems: [
      {
        id: 'dp-best-buy-sell-i',
        title: 'Best time to buy and sell stock',
        difficulty: 'Easy',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-best-buy-sell-ii',
        title: 'Best time to buy and sell stock II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-best-buy-sell-iii',
        title: 'Best time to buy and sell stock III',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-best-buy-sell-iv',
        title: 'Best time to buy and sell stock IV',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-best-buy-sell-fees',
        title: 'Best time to buy and sell stock with transaction fees',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      }
    ]
  },
  {
    id: 'dynamic-programming-iv',
    name: 'Dynamic Programming IV',
    category: 'Dynamic Programming',
    description: 'Partition and knapsack problems',
    problems: [
      {
        id: 'dp-partition-subsets',
        title: 'Partition a set into two subsets with minimum absolute sum difference',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-count-subsets-sum',
        title: 'Count subsets with sum K',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-count-partitions',
        title: 'Count partitions with given difference',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-0-1-knapsack',
        title: '0 and 1 Knapsack',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-target-sum',
        title: 'Target sum',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      }
    ]
  },
  {
    id: 'dynamic-programming-v',
    name: 'Dynamic Programming V',
    category: 'Dynamic Programming',
    description: 'Unbounded knapsack and coin change',
    problems: [
      {
        id: 'dp-coin-change-ii',
        title: 'Coin change II',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-unbounded-knapsack',
        title: 'Unbounded knapsack',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-rod-cutting',
        title: 'Rod cutting problem',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-min-coins',
        title: 'Minimum coins',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-lcs',
        title: 'Longest common subsequence',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      }
    ]
  },
  {
    id: 'dynamic-programming-vi',
    name: 'Dynamic Programming VI',
    category: 'Dynamic Programming',
    description: 'String DP and edit distance',
    problems: [
      {
        id: 'dp-lcs-substring',
        title: 'Longest common substring',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-min-insert-delete',
        title: 'Minimum insertions or deletions to convert string A to B',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-shortest-superseq',
        title: 'Shortest common supersequence',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-distinct-subseq',
        title: 'Distinct subsequences',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-edit-distance',
        title: 'Edit distance',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      }
    ]
  },
  {
    id: 'dynamic-programming-vii',
    name: 'Dynamic Programming VII',
    category: 'Dynamic Programming',
    description: 'Wildcard matching and longest increasing subsequence',
    problems: [
      {
        id: 'dp-wildcard-match',
        title: 'Wildcard matching',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-lis',
        title: 'Longest Increasing Subsequence',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-longest-string-chain',
        title: 'Longest String Chain',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-bitonic-subseq',
        title: 'Longest Bitonic Subsequence',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-num-lis',
        title: 'Number of Longest Increasing Subsequences',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-print-lis',
        title: 'Print Longest Increasing Subsequence',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      }
    ]
  },
  {
    id: 'dynamic-programming-viii',
    name: 'Dynamic Programming VIII',
    category: 'Dynamic Programming',
    description: 'Interval and advanced DP problems',
    problems: [
      {
        id: 'dp-matrix-chain-mult',
        title: 'Matrix chain multiplication',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-burst-balloons',
        title: 'Burst balloons',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-max-rectangles',
        title: 'Maximum Rectangles',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-palindrome-part-ii',
        title: 'Palindrome partitioning II',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      },
      {
        id: 'dp-min-cost-cut-stick',
        title: 'Minimum cost to cut the stick',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'DP'
      }
    ]
  },
  {
    id: 'string-trie',
    name: 'String and Trie',
    category: 'String & Trie',
    description: 'Pattern matching and advanced string algorithms',
    problems: [
      {
        id: 'string-rabin-karp',
        title: 'Rabin Karp Algorithm',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'String Matching'
      },
      {
        id: 'string-z-function',
        title: 'Z function',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'String Matching'
      },
      {
        id: 'string-kmp',
        title: 'KMP Algorithm or LPS array',
        difficulty: 'Hard',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'String Matching'
      },
      {
        id: 'trie-longest-word',
        title: 'Longest Word with All Prefixes',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Trie'
      },
      {
        id: 'trie-max-xor',
        title: 'Maximum Xor with an element from an array',
        difficulty: 'Medium',
        revision: false,
        done: false,
        insights: [],
        tags: [],
        pattern: 'Trie'
      }
    ]
  }
];

/**
 * Get section by ID
 */
export const getSectionById = (sectionId) => {
  return DSA_SECTIONS.find((s) => s.id === sectionId);
};

/**
 * Get problem by ID (searches across all sections)
 */
export const getProblemById = (problemId) => {
  for (const section of DSA_SECTIONS) {
    const problem = section.problems.find((p) => p.id === problemId);
    if (problem) {
      return { ...problem, sectionId: section.id };
    }
  }
  return null;
};

/**
 * Get all problems flattened
 */
export const getAllProblems = () => {
  const problems = [];
  DSA_SECTIONS.forEach((section) => {
    section.problems.forEach((problem) => {
      problems.push({ ...problem, sectionId: section.id });
    });
  });
  return problems;
};

/**
 * Get stats
 */
export const getStats = () => {
  const allProblems = getAllProblems();
  return {
    total: allProblems.length,
    done: allProblems.filter((p) => p.done).length,
    revision: allProblems.filter((p) => p.revision).length
  };
};

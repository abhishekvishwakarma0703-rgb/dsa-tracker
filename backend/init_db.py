"""
Database initialization script with DSA problems
Run this script to populate the database with problems
"""

import asyncio
import json
from app.db.database import async_session, init_db
from app.db.models import Problem, Tag
from sqlalchemy import select

# DSA Problems data with LeetCode links
DSA_PROBLEMS = [
    {"title": "Merge Sorting", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Divide & Conquer", "leetcode_id": "148", "section_id": "sorting-arrays-i"},
    {"title": "Quick Sorting", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Divide & Conquer", "leetcode_id": "912", "section_id": "sorting-arrays-i"},
    {"title": "Longest Consecutive Sequence in an Array", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Hashing", "leetcode_id": "128", "section_id": "sorting-arrays-i"},
    {"title": "Print the matrix in spiral manner", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Matrix Traversal", "leetcode_id": "54", "section_id": "sorting-arrays-i"},
    {"title": "Kadane's Algorithm", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Dynamic Programming", "leetcode_id": "53", "section_id": "sorting-arrays-i"},

    # Arrays II
    {"title": "Pascal's Triangle III", "difficulty": "Easy", "category": "Arrays II", "pattern": "Number Theory", "leetcode_id": "118", "section_id": "arrays-ii"},
    {"title": "Rotate matrix by 90 degrees", "difficulty": "Medium", "category": "Arrays II", "pattern": "Matrix Manipulation", "leetcode_id": "48", "section_id": "arrays-ii"},
    {"title": "Two Sum", "difficulty": "Easy", "category": "Arrays II", "pattern": "Hashing", "leetcode_id": "1", "section_id": "arrays-ii"},
    {"title": "3 Sum", "difficulty": "Medium", "category": "Arrays II", "pattern": "Two Pointers", "leetcode_id": "15", "section_id": "arrays-ii"},
    {"title": "4 Sum", "difficulty": "Medium", "category": "Arrays II", "pattern": "Two Pointers", "leetcode_id": "18", "section_id": "arrays-ii"},

    # Arrays III
    {"title": "Majority Element-I", "difficulty": "Easy", "category": "Arrays III", "pattern": "Boyer-Moore Voting", "leetcode_id": "169", "section_id": "arrays-iii"},
    {"title": "Majority Element-II", "difficulty": "Medium", "category": "Arrays III", "pattern": "Boyer-Moore Voting", "leetcode_id": "229", "section_id": "arrays-iii"},
    {"title": "Find the repeating and missing number", "difficulty": "Medium", "category": "Arrays III", "pattern": "Hashing", "leetcode_id": "287", "section_id": "arrays-iii"},
    {"title": "Count Inversions", "difficulty": "Hard", "category": "Arrays III", "pattern": "Merge Sort", "leetcode_id": None, "section_id": "arrays-iii"},
    {"title": "Reverse Pairs", "difficulty": "Hard", "category": "Arrays III", "pattern": "Merge Sort", "leetcode_id": "493", "section_id": "arrays-iii"},

    # Arrays IV & Hashing
    {"title": "Maximum Product Subarray", "difficulty": "Medium", "category": "Arrays IV & Hashing", "pattern": "Dynamic Programming", "leetcode_id": "152", "section_id": "arrays-iv-hashing"},
    {"title": "Merge Sorted Array", "difficulty": "Easy", "category": "Arrays IV & Hashing", "pattern": "Two Pointers", "leetcode_id": "88", "section_id": "arrays-iv-hashing"},
    {"title": "Longest Subarray with Sum K", "difficulty": "Medium", "category": "Arrays IV & Hashing", "pattern": "Prefix Sum", "leetcode_id": None, "section_id": "arrays-iv-hashing"},
    {"title": "Subarray Sum Equals K", "difficulty": "Medium", "category": "Arrays IV & Hashing", "pattern": "Hashing", "leetcode_id": "560", "section_id": "arrays-iv-hashing"},
    {"title": "Maximum XOR of Two Numbers", "difficulty": "Medium", "category": "Arrays IV & Hashing", "pattern": "XOR", "leetcode_id": None, "section_id": "arrays-iv-hashing"},

    # Binary Search I
    {"title": "First Bad Version", "difficulty": "Easy", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "278", "section_id": "binary-search-i"},
    {"title": "Binary Search", "difficulty": "Easy", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "704", "section_id": "binary-search-i"},
    {"title": "Search in Rotated Sorted Array II", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "33", "section_id": "binary-search-i"},
    {"title": "Find Minimum in Rotated Sorted Array", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "153", "section_id": "binary-search-i"},
    {"title": "Single Element in Sorted Array", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "540", "section_id": "binary-search-i"},

    # Binary Search II
    {"title": "Koko Eating Bananas", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search on Answer", "leetcode_id": "875", "section_id": "binary-search-ii"},
    {"title": "Minimum Days to Make M Bouquets", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search on Answer", "leetcode_id": "1482", "section_id": "binary-search-ii"},
    {"title": "Allocate Mailboxes", "difficulty": "Hard", "category": "Binary Search", "pattern": "Binary Search on Answer", "leetcode_id": "1064", "section_id": "binary-search-ii"},
    {"title": "Split Array Largest Sum", "difficulty": "Hard", "category": "Binary Search", "pattern": "Binary Search on Answer", "leetcode_id": "410", "section_id": "binary-search-ii"},
    {"title": "Median of Two Sorted Arrays", "difficulty": "Hard", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "4", "section_id": "binary-search-ii"},

    # Binary Search III
    {"title": "Search a 2D Matrix", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "74", "section_id": "binary-search-iii"},
    {"title": "Search a 2D Matrix II", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "240", "section_id": "binary-search-iii"},
    {"title": "Find Peak Element", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "162", "section_id": "binary-search-iii"},
    {"title": "Median of Data Stream", "difficulty": "Hard", "category": "Binary Search", "pattern": "Heap", "leetcode_id": "295", "section_id": "binary-search-iii"},

    # Recursion I
    {"title": "Subsets", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "78", "section_id": "recursion-i"},
    {"title": "Combination Sum", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "39", "section_id": "recursion-i"},
    {"title": "Combination Sum II", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "40", "section_id": "recursion-i"},
    {"title": "Combination Sum III", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "216", "section_id": "recursion-i"},
    {"title": "Permutations", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "46", "section_id": "recursion-i"},

    # Recursion II
    {"title": "Palindrome Partitioning", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "131", "section_id": "recursion-ii"},
    {"title": "N-Queens", "difficulty": "Hard", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "51", "section_id": "recursion-ii"},
    {"title": "Word Search II", "difficulty": "Hard", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "212", "section_id": "recursion-ii"},
    {"title": "Sudoku Solver", "difficulty": "Hard", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "37", "section_id": "recursion-ii"},

    # Linked List I
    {"title": "Reverse Linked List", "difficulty": "Easy", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "206", "section_id": "linked-list-i"},
    {"title": "Middle of the Linked List", "difficulty": "Easy", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "876", "section_id": "linked-list-i"},
    {"title": "Palindrome Linked List", "difficulty": "Easy", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "234", "section_id": "linked-list-i"},
    {"title": "Remove Nth Node From End", "difficulty": "Medium", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "19", "section_id": "linked-list-i"},
    {"title": "Intersection of Two Linked Lists", "difficulty": "Easy", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "160", "section_id": "linked-list-i"},

    # Linked List II
    {"title": "Linked List Cycle", "difficulty": "Easy", "category": "Linked List", "pattern": "Cycle Detection", "leetcode_id": "141", "section_id": "linked-list-ii"},
    {"title": "Linked List Cycle II", "difficulty": "Medium", "category": "Linked List", "pattern": "Cycle Detection", "leetcode_id": "142", "section_id": "linked-list-ii"},
    {"title": "Reverse Linked List II", "difficulty": "Medium", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "92", "section_id": "linked-list-ii"},
    {"title": "Sort List", "difficulty": "Medium", "category": "Linked List", "pattern": "Merge Sort", "leetcode_id": "148-ll", "section_id": "linked-list-ii"},
    {"title": "Flatten Multilevel Doubly Linked List", "difficulty": "Medium", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "430", "section_id": "linked-list-ii"},

    # Greedy
    {"title": "Meeting Rooms II", "difficulty": "Medium", "category": "Greedy", "pattern": "Greedy", "leetcode_id": "253", "section_id": "greedy-algorithms"},
    {"title": "Non-overlapping Intervals", "difficulty": "Medium", "category": "Greedy", "pattern": "Greedy", "leetcode_id": "435", "section_id": "greedy-algorithms"},
    {"title": "Gas Station", "difficulty": "Medium", "category": "Greedy", "pattern": "Greedy", "leetcode_id": "134", "section_id": "greedy-algorithms"},
    {"title": "Jump Game", "difficulty": "Medium", "category": "Greedy", "pattern": "Greedy", "leetcode_id": "55", "section_id": "greedy-algorithms"},
    {"title": "Candy", "difficulty": "Hard", "category": "Greedy", "pattern": "Greedy", "leetcode_id": "135", "section_id": "greedy-algorithms"},

    # Sliding Window I
    {"title": "Longest Substring Without Repeating Characters", "difficulty": "Medium", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "3", "section_id": "sliding-window-i"},
    {"title": "Max Consecutive Ones III", "difficulty": "Medium", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "1004", "section_id": "sliding-window-i"},
    {"title": "Longest Substring with At Most K Distinct Characters", "difficulty": "Hard", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "340", "section_id": "sliding-window-i"},
    {"title": "Longest Repeating Character Replacement", "difficulty": "Medium", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "424", "section_id": "sliding-window-i"},
    {"title": "Fruit Into Baskets", "difficulty": "Medium", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "904", "section_id": "sliding-window-i"},

    # Sliding Window II
    {"title": "Maximum Points You Can Obtain from Cards", "difficulty": "Medium", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "1423", "section_id": "sliding-window-ii"},
    {"title": "Minimum Window Substring", "difficulty": "Hard", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "76", "section_id": "sliding-window-ii"},
    {"title": "Permutation in String", "difficulty": "Medium", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "567", "section_id": "sliding-window-ii"},
    {"title": "Binary Subarrays With Sum", "difficulty": "Medium", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "930", "section_id": "sliding-window-ii"},
    {"title": "Count Nice Subarrays", "difficulty": "Medium", "category": "Sliding Window", "pattern": "Sliding Window", "leetcode_id": "1248", "section_id": "sliding-window-ii"},

    # Stack & Queue I
    {"title": "Next Greater Element I", "difficulty": "Easy", "category": "Stack & Queue", "pattern": "Monotonic Stack", "leetcode_id": "496", "section_id": "stack-queue-i"},
    {"title": "Next Greater Element II", "difficulty": "Medium", "category": "Stack & Queue", "pattern": "Monotonic Stack", "leetcode_id": "503", "section_id": "stack-queue-i"},
    {"title": "Asteroid Collision", "difficulty": "Medium", "category": "Stack & Queue", "pattern": "Stack", "leetcode_id": "735", "section_id": "stack-queue-i"},
    {"title": "Sum of Subarray Minimums", "difficulty": "Hard", "category": "Stack & Queue", "pattern": "Monotonic Stack", "leetcode_id": "907", "section_id": "stack-queue-i"},
    {"title": "Remove K Digits", "difficulty": "Medium", "category": "Stack & Queue", "pattern": "Greedy", "leetcode_id": "402", "section_id": "stack-queue-i"},

    # Stack & Queue II
    {"title": "Min Stack", "difficulty": "Easy", "category": "Stack & Queue", "pattern": "Stack", "leetcode_id": "155", "section_id": "stack-queue-ii"},
    {"title": "Sliding Window Maximum", "difficulty": "Hard", "category": "Stack & Queue", "pattern": "Deque", "leetcode_id": "239", "section_id": "stack-queue-ii"},
    {"title": "Trapping Rain Water", "difficulty": "Hard", "category": "Stack & Queue", "pattern": "Two Pointers", "leetcode_id": "42", "section_id": "stack-queue-ii"},
    {"title": "Largest Rectangle in Histogram", "difficulty": "Hard", "category": "Stack & Queue", "pattern": "Monotonic Stack", "leetcode_id": "84", "section_id": "stack-queue-ii"},
    {"title": "LRU Cache", "difficulty": "Medium", "category": "Stack & Queue", "pattern": "Design", "leetcode_id": "146", "section_id": "stack-queue-ii"},

    # Heaps
    {"title": "Kth Largest Element in an Array", "difficulty": "Medium", "category": "Heaps", "pattern": "Heap", "leetcode_id": "215", "section_id": "heaps"},
    {"title": "K Closest Points to Origin", "difficulty": "Medium", "category": "Heaps", "pattern": "Heap", "leetcode_id": "973", "section_id": "heaps"},
    {"title": "Top K Frequent Elements", "difficulty": "Medium", "category": "Heaps", "pattern": "Heap", "leetcode_id": "347", "section_id": "heaps"},

    # Binary Tree I
    {"title": "Binary Tree Preorder Traversal", "difficulty": "Easy", "category": "Binary Tree", "pattern": "Tree Traversal", "leetcode_id": "144", "section_id": "binary-tree-i"},
    {"title": "Binary Tree Inorder Traversal", "difficulty": "Easy", "category": "Binary Tree", "pattern": "Tree Traversal", "leetcode_id": "94", "section_id": "binary-tree-i"},
    {"title": "Binary Tree Postorder Traversal", "difficulty": "Easy", "category": "Binary Tree", "pattern": "Tree Traversal", "leetcode_id": "145", "section_id": "binary-tree-i"},
    {"title": "Binary Tree Level Order Traversal", "difficulty": "Medium", "category": "Binary Tree", "pattern": "BFS", "leetcode_id": "102", "section_id": "binary-tree-i"},
    {"title": "Maximum Depth of Binary Tree", "difficulty": "Easy", "category": "Binary Tree", "pattern": "DFS", "leetcode_id": "104", "section_id": "binary-tree-i"},

    # Binary Tree II
    {"title": "Diameter of Binary Tree", "difficulty": "Easy", "category": "Binary Tree", "pattern": "DFS", "leetcode_id": "543", "section_id": "binary-tree-ii"},
    {"title": "Binary Tree Maximum Path Sum", "difficulty": "Hard", "category": "Binary Tree", "pattern": "DFS", "leetcode_id": "124", "section_id": "binary-tree-ii"},
    {"title": "Symmetric Tree", "difficulty": "Easy", "category": "Binary Tree", "pattern": "DFS", "leetcode_id": "101", "section_id": "binary-tree-ii"},
    {"title": "Boundary of Binary Tree", "difficulty": "Hard", "category": "Binary Tree", "pattern": "Tree Traversal", "leetcode_id": "545", "section_id": "binary-tree-ii"},
    {"title": "Vertical Order Traversal of a Binary Tree", "difficulty": "Hard", "category": "Binary Tree", "pattern": "BFS", "leetcode_id": "987", "section_id": "binary-tree-ii"},

    # Binary Tree III
    {"title": "Binary Tree Right Side View", "difficulty": "Medium", "category": "Binary Tree", "pattern": "BFS", "leetcode_id": "199", "section_id": "binary-tree-iii"},
    {"title": "Lowest Common Ancestor", "difficulty": "Medium", "category": "Binary Tree", "pattern": "DFS", "leetcode_id": "236", "section_id": "binary-tree-iii"},
    {"title": "Maximum Width of Binary Tree", "difficulty": "Medium", "category": "Binary Tree", "pattern": "BFS", "leetcode_id": "662", "section_id": "binary-tree-iii"},

    # Binary Tree IV
    {"title": "Count Complete Tree Nodes", "difficulty": "Easy", "category": "Binary Tree", "pattern": "DFS", "leetcode_id": "222", "section_id": "binary-tree-iv"},
    {"title": "Construct Binary Tree from Preorder and Inorder Traversal", "difficulty": "Medium", "category": "Binary Tree", "pattern": "Tree Construction", "leetcode_id": "105", "section_id": "binary-tree-iv"},
    {"title": "Serialize and Deserialize Binary Tree", "difficulty": "Hard", "category": "Binary Tree", "pattern": "Tree Traversal", "leetcode_id": "297", "section_id": "binary-tree-iv"},

    # Binary Search Tree I
    {"title": "Lowest Common Ancestor of a BST", "difficulty": "Easy", "category": "Binary Search Tree", "pattern": "BST", "leetcode_id": "235", "section_id": "binary-search-tree-i"},
    {"title": "Kth Smallest Element in a BST", "difficulty": "Easy", "category": "Binary Search Tree", "pattern": "BST", "leetcode_id": "230", "section_id": "binary-search-tree-i"},
    {"title": "Validate Binary Search Tree", "difficulty": "Medium", "category": "Binary Search Tree", "pattern": "BST", "leetcode_id": "98", "section_id": "binary-search-tree-i"},

    # Binary Search Tree II
    {"title": "Binary Search Tree Iterator", "difficulty": "Medium", "category": "Binary Search Tree", "pattern": "Design", "leetcode_id": "173", "section_id": "binary-search-tree-ii"},
    {"title": "Two Sum IV - Input is a BST", "difficulty": "Easy", "category": "Binary Search Tree", "pattern": "BST", "leetcode_id": "653", "section_id": "binary-search-tree-ii"},
    {"title": "Recover Binary Search Tree", "difficulty": "Hard", "category": "Binary Search Tree", "pattern": "BST", "leetcode_id": "99", "section_id": "binary-search-tree-ii"},

    # Graphs I
    {"title": "Number of Islands", "difficulty": "Medium", "category": "Graphs", "pattern": "DFS/BFS", "leetcode_id": "200", "section_id": "graph-i"},
    {"title": "Flood Fill", "difficulty": "Easy", "category": "Graphs", "pattern": "DFS", "leetcode_id": "733", "section_id": "graph-i"},
    {"title": "Rotting Oranges", "difficulty": "Medium", "category": "Graphs", "pattern": "BFS", "leetcode_id": "994", "section_id": "graph-i"},
    {"title": "Surrounded Regions", "difficulty": "Medium", "category": "Graphs", "pattern": "DFS", "leetcode_id": "130", "section_id": "graph-i"},

    # Graphs II
    {"title": "Number of Distinct Islands", "difficulty": "Medium", "category": "Graphs", "pattern": "DFS", "leetcode_id": "694", "section_id": "graph-ii"},
    {"title": "Is Graph Bipartite", "difficulty": "Medium", "category": "Graphs", "pattern": "BFS", "leetcode_id": "785", "section_id": "graph-ii"},
    {"title": "Course Schedule", "difficulty": "Medium", "category": "Graphs", "pattern": "Topological Sort", "leetcode_id": "207", "section_id": "graph-ii"},
    {"title": "Detect Cycle in Directed Graph", "difficulty": "Medium", "category": "Graphs", "pattern": "Cycle Detection", "leetcode_id": None, "section_id": "graph-ii"},

    # Graphs III
    {"title": "Course Schedule II", "difficulty": "Medium", "category": "Graphs", "pattern": "Topological Sort", "leetcode_id": "210", "section_id": "graph-iii"},
    {"title": "Alien Dictionary", "difficulty": "Hard", "category": "Graphs", "pattern": "Topological Sort", "leetcode_id": "269", "section_id": "graph-iii"},
    {"title": "Network Delay Time", "difficulty": "Medium", "category": "Graphs", "pattern": "Dijkstra", "leetcode_id": "743", "section_id": "graph-iii"},

    # Graphs IV
    {"title": "Word Ladder", "difficulty": "Hard", "category": "Graphs", "pattern": "BFS", "leetcode_id": "127", "section_id": "graph-iv"},
    {"title": "Word Ladder II", "difficulty": "Hard", "category": "Graphs", "pattern": "BFS", "leetcode_id": "126", "section_id": "graph-iv"},
    {"title": "Path with Maximum Probability", "difficulty": "Medium", "category": "Graphs", "pattern": "Dijkstra", "leetcode_id": "1514", "section_id": "graph-iv"},

    # Dynamic Programming I
    {"title": "Climbing Stairs", "difficulty": "Easy", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "70", "section_id": "dynamic-programming-i"},
    {"title": "House Robber", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "198", "section_id": "dynamic-programming-i"},
    {"title": "House Robber II", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "213", "section_id": "dynamic-programming-i"},

    # Dynamic Programming II
    {"title": "Unique Paths", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "62", "section_id": "dynamic-programming-ii"},
    {"title": "Unique Paths II", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "63", "section_id": "dynamic-programming-ii"},
    {"title": "Minimum Path Sum", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "64", "section_id": "dynamic-programming-ii"},

    # Dynamic Programming III
    {"title": "Best Time to Buy and Sell Stock", "difficulty": "Easy", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "121", "section_id": "dynamic-programming-iii"},
    {"title": "Best Time to Buy and Sell Stock II", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "122", "section_id": "dynamic-programming-iii"},
    {"title": "Best Time to Buy and Sell Stock III", "difficulty": "Hard", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "123", "section_id": "dynamic-programming-iii"},
    {"title": "Best Time to Buy and Sell Stock with Cooldown", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "309", "section_id": "dynamic-programming-iii"},

    # Dynamic Programming IV
    {"title": "0/1 Knapsack", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": None, "section_id": "dynamic-programming-iv"},
    {"title": "Partition Equal Subset Sum", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "416", "section_id": "dynamic-programming-iv"},
    {"title": "Target Sum", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "494", "section_id": "dynamic-programming-iv"},

    # Dynamic Programming V
    {"title": "Coin Change", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "322", "section_id": "dynamic-programming-v"},
    {"title": "Coin Change II", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "518", "section_id": "dynamic-programming-v"},

    # Dynamic Programming VI
    {"title": "Longest Common Subsequence", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "1143", "section_id": "dynamic-programming-vi"},
    {"title": "Edit Distance", "difficulty": "Hard", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "72", "section_id": "dynamic-programming-vi"},

    # Dynamic Programming VII
    {"title": "Longest Increasing Subsequence", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "300", "section_id": "dynamic-programming-vii"},
    {"title": "Longest String Chain", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "1048", "section_id": "dynamic-programming-vii"},

    # String & Trie
    {"title": "Word Search", "difficulty": "Medium", "category": "String & Trie", "pattern": "Backtracking", "leetcode_id": "79", "section_id": "string-trie"},
    {"title": "Word Search II", "difficulty": "Hard", "category": "String & Trie", "pattern": "Trie", "leetcode_id": "212-trie", "section_id": "string-trie"},
    {"title": "Longest Word in Dictionary", "difficulty": "Medium", "category": "String & Trie", "pattern": "Trie", "leetcode_id": "720", "section_id": "string-trie"},
]
async def populate_database():
    """Populate database with DSA problems"""
    try:
        # Initialize database
        await init_db()
        print("✅ Database initialized")
        
        # Insert problems
        async with async_session() as session:
            # Check if problems already exist
            result = await session.execute(select(Problem))
            existing = result.scalars().first()
            
            if existing:
                print("⚠️  Problems already exist in database. Skipping population.")
                return
            
            problems_to_insert = []
            for problem_data in DSA_PROBLEMS:
                problem = Problem(
                    title=problem_data["title"],
                    difficulty=problem_data["difficulty"],
                    category=problem_data["category"],
                    pattern=problem_data.get("pattern"),
                    leetcode_id=problem_data.get("leetcode_id"),
                    section_id=problem_data.get("section_id"),
                    acceptance_rate=0,
                    total_submissions=0
                )
                problems_to_insert.append(problem)
            
            session.add_all(problems_to_insert)
            await session.commit()
            print(f"✅ Successfully inserted {len(problems_to_insert)} problems")
            print(f"📊 Problems by difficulty:")
            print(f"   - Easy: {len([p for p in DSA_PROBLEMS if p['difficulty'] == 'Easy'])}")
            print(f"   - Medium: {len([p for p in DSA_PROBLEMS if p['difficulty'] == 'Medium'])}")
            print(f"   - Hard: {len([p for p in DSA_PROBLEMS if p['difficulty'] == 'Hard'])}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(populate_database())

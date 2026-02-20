"""
Database initialization script with DSA problems
"""
import asyncio
import json
import os
from app.db.database import async_session, init_db
from app.db.models import Problem, Tag, LeetCodeMaster
from sqlalchemy import select

DSA_PROBLEMS = [
    {"title": "Merge Sorting", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Divide & Conquer", "leetcode_id": "148", "leetcode_slug": "sort-list", "section_id": "sorting-arrays-i"},
    {"title": "Quick Sorting", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Divide & Conquer", "leetcode_id": "912", "leetcode_slug": "sort-an-array", "section_id": "sorting-arrays-i"},
    {"title": "Longest Consecutive Sequence in an Array", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Hashing", "leetcode_id": "128", "leetcode_slug": "longest-consecutive-sequence", "section_id": "sorting-arrays-i"},
    {"title": "Print the matrix in spiral manner", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Matrix Traversal", "leetcode_id": "54", "leetcode_slug": "spiral-matrix", "section_id": "sorting-arrays-i"},
    {"title": "Kadane's Algorithm", "difficulty": "Medium", "category": "Sorting & Arrays I", "pattern": "Dynamic Programming", "leetcode_id": "53", "leetcode_slug": "maximum-subarray", "section_id": "sorting-arrays-i"},
    {"title": "Pascal's Triangle III", "difficulty": "Easy", "category": "Arrays II", "pattern": "Number Theory", "leetcode_id": "118", "leetcode_slug": "pascals-triangle", "section_id": "arrays-ii"},
    {"title": "Rotate matrix by 90 degrees", "difficulty": "Medium", "category": "Arrays II", "pattern": "Matrix Manipulation", "leetcode_id": "48", "leetcode_slug": "rotate-image", "section_id": "arrays-ii"},
    {"title": "Two Sum", "difficulty": "Easy", "category": "Arrays II", "pattern": "Hashing", "leetcode_id": "1", "leetcode_slug": "two-sum", "section_id": "arrays-ii"},
    {"title": "3 Sum", "difficulty": "Medium", "category": "Arrays II", "pattern": "Two Pointers", "leetcode_id": "15", "leetcode_slug": "3sum", "section_id": "arrays-ii"},
    {"title": "4 Sum", "difficulty": "Medium", "category": "Arrays II", "pattern": "Two Pointers", "leetcode_id": "18", "leetcode_slug": "4sum", "section_id": "arrays-ii"},
    {"title": "Majority Element-I", "difficulty": "Easy", "category": "Arrays III", "pattern": "Boyer-Moore Voting", "leetcode_id": "169", "leetcode_slug": "majority-element", "section_id": "arrays-iii"},
    {"title": "Majority Element-II", "difficulty": "Medium", "category": "Arrays III", "pattern": "Boyer-Moore Voting", "leetcode_id": "229", "leetcode_slug": "majority-element-ii", "section_id": "arrays-iii"},
    {"title": "Find the repeating and missing number", "difficulty": "Medium", "category": "Arrays III", "pattern": "Hashing", "leetcode_id": "287", "leetcode_slug": "find-the-duplicate-number", "section_id": "arrays-iii"},
    {"title": "Count Inversions", "difficulty": "Hard", "category": "Arrays III", "pattern": "Merge Sort", "leetcode_id": None, "leetcode_slug": None, "section_id": "arrays-iii"},
    {"title": "Reverse Pairs", "difficulty": "Hard", "category": "Arrays III", "pattern": "Merge Sort", "leetcode_id": "493", "leetcode_slug": "reverse-pairs", "section_id": "arrays-iii"},
    {"title": "Maximum Product Subarray", "difficulty": "Medium", "category": "Arrays IV & Hashing", "pattern": "Dynamic Programming", "leetcode_id": "152", "leetcode_slug": "maximum-product-subarray", "section_id": "arrays-iv-hashing"},
    {"title": "Merge Sorted Array", "difficulty": "Easy", "category": "Arrays IV & Hashing", "pattern": "Two Pointers", "leetcode_id": "88", "leetcode_slug": "merge-sorted-array", "section_id": "arrays-iv-hashing"},
    {"title": "Subarray Sum Equals K", "difficulty": "Medium", "category": "Arrays IV & Hashing", "pattern": "Hashing", "leetcode_id": "560", "leetcode_slug": "subarray-sum-equals-k", "section_id": "arrays-iv-hashing"},
    {"title": "First Bad Version", "difficulty": "Easy", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "278", "leetcode_slug": "first-bad-version", "section_id": "binary-search-i"},
    {"title": "Binary Search", "difficulty": "Easy", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "704", "leetcode_slug": "binary-search", "section_id": "binary-search-i"},
    {"title": "Search in Rotated Sorted Array", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "33", "leetcode_slug": "search-in-rotated-sorted-array", "section_id": "binary-search-i"},
    {"title": "Find Minimum in Rotated Sorted Array", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "153", "leetcode_slug": "find-minimum-in-rotated-sorted-array", "section_id": "binary-search-i"},
    {"title": "Koko Eating Bananas", "difficulty": "Medium", "category": "Binary Search", "pattern": "Binary Search on Answer", "leetcode_id": "875", "leetcode_slug": "koko-eating-bananas", "section_id": "binary-search-ii"},
    {"title": "Median of Two Sorted Arrays", "difficulty": "Hard", "category": "Binary Search", "pattern": "Binary Search", "leetcode_id": "4", "leetcode_slug": "median-of-two-sorted-arrays", "section_id": "binary-search-ii"},
    {"title": "Subsets", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "78", "leetcode_slug": "subsets", "section_id": "recursion-i"},
    {"title": "Combination Sum", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "39", "leetcode_slug": "combination-sum", "section_id": "recursion-i"},
    {"title": "Permutations", "difficulty": "Medium", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "46", "leetcode_slug": "permutations", "section_id": "recursion-i"},
    {"title": "N-Queens", "difficulty": "Hard", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "51", "leetcode_slug": "n-queens", "section_id": "recursion-ii"},
    {"title": "Sudoku Solver", "difficulty": "Hard", "category": "Recursion", "pattern": "Backtracking", "leetcode_id": "37", "leetcode_slug": "sudoku-solver", "section_id": "recursion-ii"},
    {"title": "Reverse Linked List", "difficulty": "Easy", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "206", "leetcode_slug": "reverse-linked-list", "section_id": "linked-list-i"},
    {"title": "Middle of the Linked List", "difficulty": "Easy", "category": "Linked List", "pattern": "Linked List", "leetcode_id": "876", "leetcode_slug": "middle-of-the-linked-list", "section_id": "linked-list-i"},
    {"title": "Linked List Cycle", "difficulty": "Easy", "category": "Linked List", "pattern": "Cycle Detection", "leetcode_id": "141", "leetcode_slug": "linked-list-cycle", "section_id": "linked-list-ii"},
    {"title": "LRU Cache", "difficulty": "Medium", "category": "Stack & Queue", "pattern": "Design", "leetcode_id": "146", "leetcode_slug": "lru-cache", "section_id": "stack-queue-ii"},
    {"title": "Trapping Rain Water", "difficulty": "Hard", "category": "Stack & Queue", "pattern": "Two Pointers", "leetcode_id": "42", "leetcode_slug": "trapping-rain-water", "section_id": "stack-queue-ii"},
    {"title": "Kth Largest Element in an Array", "difficulty": "Medium", "category": "Heaps", "pattern": "Heap", "leetcode_id": "215", "leetcode_slug": "kth-largest-element-in-an-array", "section_id": "heaps"},
    {"title": "Number of Islands", "difficulty": "Medium", "category": "Graphs", "pattern": "DFS/BFS", "leetcode_id": "200", "leetcode_slug": "number-of-islands", "section_id": "graph-i"},
    {"title": "Course Schedule", "difficulty": "Medium", "category": "Graphs", "pattern": "Topological Sort", "leetcode_id": "207", "leetcode_slug": "course-schedule", "section_id": "graph-ii"},
    {"title": "Climbing Stairs", "difficulty": "Easy", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "70", "leetcode_slug": "climbing-stairs", "section_id": "dynamic-programming-i"},
    {"title": "Coin Change", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "322", "leetcode_slug": "coin-change", "section_id": "dynamic-programming-v"},
    {"title": "Longest Common Subsequence", "difficulty": "Medium", "category": "Dynamic Programming", "pattern": "DP", "leetcode_id": "1143", "leetcode_slug": "longest-common-subsequence", "section_id": "dynamic-programming-vi"},
]


async def populate_database():
    """Populate database with DSA problems and ingest LeetCode master list"""
    try:
        await init_db()
        print("✅ Database initialized")

        async with async_session() as session:
            # Check if problems already exist
            result = await session.execute(select(Problem))
            existing = result.scalars().first()

            if not existing:
                problems_to_insert = []
                for pd in DSA_PROBLEMS:
                    p = Problem(
                        title=pd["title"],
                        difficulty=pd["difficulty"],
                        category=pd["category"],
                        pattern=pd.get("pattern"),
                        leetcode_id=pd.get("leetcode_id"),
                        leetcode_slug=pd.get("leetcode_slug"),
                        section_id=pd.get("section_id"),
                        acceptance_rate=0,
                        total_submissions=0,
                    )
                    problems_to_insert.append(p)
                session.add_all(problems_to_insert)
                await session.commit()
                print(f"✅ Inserted {len(problems_to_insert)} problems")
            else:
                print("⚠️  Problems already exist, skipping problem population")

            # Ingest LeetCode master list
            master_check = await session.execute(select(LeetCodeMaster))
            if master_check.scalars().first():
                print("⚠️  LeetCode master already ingested, skipping")
                return

            json_path = "leetcode_problems.json"
            if os.path.exists(json_path):
                with open(json_path, "r") as f:
                    raw = json.load(f)
                masters = []
                for item in raw:
                    qid = str(item.get("questionId", "")).strip()
                    if not qid:
                        continue
                    masters.append(LeetCodeMaster(
                        question_id=qid,
                        title=item.get("title", ""),
                        title_slug=item.get("titleSlug", ""),
                        difficulty=item.get("difficulty", "Medium"),
                        ac_rate=item.get("acRate", 0.0),
                        is_paid_only=item.get("isPaidOnly", False),
                        topic_tags=item.get("topicTags", []),
                        category_title=item.get("categoryTitle", "Algorithms"),
                    ))
                session.add_all(masters)
                await session.commit()
                print(f"✅ Ingested {len(masters)} LeetCode master problems")
            else:
                print(f"⚠️  {json_path} not found, skipping master ingest")

    except Exception as e:
        print(f"❌ Error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(populate_database())

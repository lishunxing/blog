# 移动零

给定一个数组 `nums`，编写一个函数将所有 `0` 移动到数组的末尾，同时保持非零元素的相对顺序。

**请注意** ，必须在不复制数组的情况下原地对数组进行操作。

**示例 1:**

    输入: nums = [0,1,0,3,12]
    输出: [1,3,12,0,0]

**示例 2:**

    输入: nums = [0]
    输出: [0]

**提示**:

*   `1 <= nums.length <= 10`^4^
*   `-2`^31^` <= nums[i] <= 2`^31^` - 1`



## 题解

使用双指针，左指针指向当前已经处理好的序列的尾部，右指针指向待处理序列的头部。 右指针不断向右移动，每次右指针指向非零数，则将左右指针对应的数交换，同时左指针右移。

这样左指针左边均为非零数； 右指针左边直到左指针处均为零。 因此每次交换，都是将左指针的零与右指针的非零数交换，且非零数的相对顺序并未改变。

```java
	public static void moveZeroes2(int[] nums) {
        int left = 0;
        int right = 0;
        while (right < nums.length) {
            if (nums[right] != 0) {
                int temp = nums[left];
                nums[left] = nums[right];
                nums[right] = temp;
                left++;
            }
            right++;
        }
    }
```

还可以直接使用for循环遍历, 数组最前方0元素k的位置，如果k为-1，则表示数组中不存在0元素，直接返回；

否则，从k位置开始，将后续元素依次向前移动，直到遇到非0元素，此时将k位置元素赋值给该非0元素, 并且使用k记录当前位置;

当有元素替换掉k位置的值时, 判断一下k后面的那个元素是否是0, 如果是的话, 就使用k后面的元素替换k的位置, 防止多个0在一起的情况.

```java
	public static void moveZeroes(int[] nums) {
        if (nums.length < 2) {
            return;
        }
        int k = -1;
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] == 0 && k == -1) {
                k = i;
            }
            if (nums[i] != 0 && k != -1) {
                nums[k] = nums[i];
                nums[i] = 0;
                k = nums[k + 1] == 0 ? k + 1 : i;
            }
        }
    }
```


# 两数之和

> <https://leetcode.cn/problems/two-sum/description/>

给定一个整数数组 `nums` 和一个整数目标值 `target`，请你在该数组中找出和为目标值 *`target`*  的那 **两个** 整数，并返回它们的数组下标。

你可以假设每种输入只会对应一个答案，并且你不能使用两次相同的元素。

你可以按任意顺序返回答案。

**示例 1：**
```
    输入：nums = [2,7,11,15], target = 9
    输出：[0,1]
    解释：因为 nums[0] + nums[1] == 9 ，返回 [0, 1] 。
```
**示例 2：**
```
    输入：nums = [3,2,4], target = 6
    输出：[1,2]
```
**示例 3：**
```
    输入：nums = [3,3], target = 6
    输出：[0,1]
```
**提示：**

*   `2 <= nums.length <= 10^4`
*   `-10^9^` <= nums[i] <= 10`^9^
*   `-10^9^` <= target <= 10`^9^
*   **只会存在一个有效答案**

## 题解

首先看到这个问题, 第一印象可以直接使用暴力枚举的方式去解决. 假设数组内容为示例1的\[2,7,11,15], 这里无论target是多少, 我们只需要拿第一个数字与后面的所有数字单独相加, 如果没有得出target, 就进行第二次遍历

拿第二个数字与后面的所有数字相加, 还没有的话就拿第三个数字, 以此类推. 所以可以得出,  在最差的情况下, 我们需要一直拿到数组倒数第二个数字, 与最后一个数字相加, 如图所示, 假设这里target是26:

<https://www.processon.com/diagraming/66da770ccba92c0d4853a873>

由此可以得出如下代码:

```java
	public static int[] twoSum(int[] nums, int target) {
        // 遍历数组, 循环数组长度-1次. 在这个数组 {2,7,11,15} 中, 最多会拿2,7,11 依次与后面的数字相加
        for (int i = 0; i < nums.length - 1; i++) {
            // 从下标i+1开始遍历, 第一次就是拿7,11,15 与2相加, 当i为2时, 就是拿11,15 与7 相加
            for (int j = i + 1; j < nums.length; j++) {
                // 如果有相加等于target的 就直接返回下标
                if (nums[i] + nums[j] == target) {
                    return new int[]{i, j};
                }
            }
        }
        return new int[0];
    }
```

最终,当i为3的时候, 找出了target的值. 以上方法的时间复杂度为O(n²), 空间复杂度为O(1). &#x20;

**优化:**

在每次遍历的时候, 我们都会重复的给第一个元素之后的元素全部都重新拿来相加一遍. 这里我们可以考虑给所有使用过的元素都存起来, 到hashmap中, 把值作为hashMap的key, 下标作为value . 这样我们遍历到后面的元素的时候, 只需要判断target - 当前元素值是否为hashMap中的key, 就可以直接找到2个元素的下标, 返回即可.

```java
    public static HashMap<Integer, Integer> map = new HashMap<>();

    public static int[] twoSum2(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[]{map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
```


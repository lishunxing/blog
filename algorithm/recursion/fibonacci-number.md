# 斐波那契数

> <https://leetcode.cn/problems/fibonacci-number/description/>

**斐波那契数** （通常用 `F(n)` 表示）形成的序列称为 **斐波那契数列** 。该数列由 `0` 和 `1` 开始，后面的每一项数字都是前面两项数字的和。也就是：

```
F(0) = 0，F(1) = 1
F(n) = F(n - 1) + F(n - 2)，其中 n > 1

```

给定 `n` ，请计算 `F(n)` 。

**示例 1：**

```
输入：n = 2
输出：1
解释：F(2) = F(1) + F(0) = 1 + 0 = 1

```

**示例 2：**

```
输入：n = 3
输出：2
解释：F(3) = F(2) + F(1) = 1 + 1 = 2

```

**示例 3：**

```
输入：n = 4
输出：3
解释：F(4) = F(3) + F(2) = 2 + 1 = 3

```

**提示：**

*   `0 <= n <= 30`

## 题解

已知公式F(n) = F(n - 1) + F(n - 2), 同时F(0) = 0，F(1) = 1  可以得出如下代码

```java
    public static int fib(int n) {
        if (n == 0) {
            return 0;
        }
        if (n == 1) {
            return 1;
        }

        return fib(n - 1) + fib(n - 2);
    }
```

同理, 此函数与爬楼梯的执行过程一样都会存在重复计算的问题, 比如当n为6的时候 fib(6-1)的第二次循环就会执行fib(6-2), 所以这里可以添加一个map记录一下返回值, 优化后的代码如下:

```java
    public static HashMap<Integer, Integer> map = new HashMap<>();

    public static int fib(int n) {
        if (map.containsKey(n)) {
            return map.get(n);
        }
        if (n == 0) {
            return 0;
        }
        if (n == 1) {
            return 1;
        }

        int result = fib(n - 1) + fib(n - 2);
        map.put(n, result);
        return result;
    }
```


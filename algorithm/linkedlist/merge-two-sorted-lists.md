# 合并两个有序链表

> <https://leetcode.cn/problems/merge-two-sorted-lists>

将两个升序链表合并为一个新的 **升序** 链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。 

 

**示例 1：**

![](https://assets.leetcode.com/uploads/2020/10/03/merge_ex1.jpg)

输入：l1 = \[1,2,4], l2 = \[1,3,4]
输出：\[1,1,2,3,4,4]

**示例 2：**

输入：l1 = \[], l2 = \[]
输出：\[]

**示例 3：**

输入：l1 = \[], l2 = \[0]
输出：\[0]

## 题解

这里有2个链表 分别为 \[1,2,4] 与 \[1,3,4]

设置一个返回节点result, 同时设置一个临时节点用于记录当前遍历的值, 比如叫temp, 初始值与result相同. &#x20;

因为2个链表都是有序的, 所以这里从两个链表的第一个值开始比较, 给较小的值放在前一位, 然后给当前较小值的链表往后挪一位.

最开始遍历 list1 与 list2的值都是1 所以这里给temp的next指向list1  然后list1指向list1.next, 用于下一次的比较

这个时候顺序为 temp->list1. list1这个时候就从1变成了2 然后将temp指向temp.next 开始下一次的对比

第二次比较 就是list1的第二个元素2  与list2的第一个元素1 进行比较 很显然1比2小 这个时候temp的next节点就指向list2的第一个元素  同时list2的当前元素往后移一位 这个时候temp就是list2的当前较大元素

以此类推, 当list1或者list2的后一位为null时, 直接挂到temp.next 就完成了链表的有序合并

## 代码

```java
	/**
     * 思路： 创建一个头节点，然后比较两个链表节点的值，将较小的节点加入到新链表中，直到两个链表都为空
     */
    public static ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // 创建一个头结点, 用于返回合并好的链表结果
        ListNode head = new ListNode();
        // 创建一个临时节点，用于记录当前存放较小的链表节点
        ListNode temp = head;

        // 如果两个链表都不为空的情况下 进行遍历
        while (list1 != null && list2 != null) {
            // 如果list1的值小于list2的值，则将list1的值加入到新链表中，并将list1指向下一个节点
            if (list1.val <= list2.val) {
                temp.next = list1;
                list1 = list1.next;
            }
            // 否则，将list2的值加入到新链表中，并将list2指向下一个节点
            else {
                temp.next = list2;
                list2 = list2.next;
            }
            // 将temp指向下一个节点
            temp = temp.next;

        }
        // 如果两个链表有一个为空的情况下，则将另一个链表的剩余节点直接加入到新链表中
        if (list1 == null) {
            temp.next = list2;
        }

        if (list2 == null) {
            temp.next = list1;
        }

        // 返回新链表的头结点
        return head.next;
    }
```


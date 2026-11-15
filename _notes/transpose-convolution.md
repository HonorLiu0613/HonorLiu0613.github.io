---
类型: 知识笔记
领域: 深度学习
状态: 学习中
创建时间: 2026-11-12 00:00
修改时间: 2026-11-14 21:15:19
tags:
  - 领域/深度学习
  - 模块/转置卷积
  - 模块/上采样
title: 转置卷积 Transpose Conv
date: 2026-11-12
updated: 2026-11-15
publish: true
domain: 深度学习
featured: false
excerpt: 转置卷积是一种带可学习参数的上采样运算。它对应普通卷积矩阵表示的转置，但不是普通卷积的逆运算，也不保证恢复原始输入。
web_slug: transpose-convolution
web_id: transpose-convolution
rendered_body: rendered-notes/transpose-convolution.html
rendered_source_hash: aab822da1e9ec1f1ef63bbb220a7ddac112054eea3f1cd290e9c7f0643220c6d
source_vault_path: 02-知识笔记/1. 深度学习/1. 转置卷积 Transpose Conv.md
mathjax: true
render_with_liquid: false
---

## 一句话理解

转置卷积是一种带可学习参数的上采样运算。它对应普通卷积矩阵表示的转置，但不是普通卷积的逆运算，也不保证恢复原始输入。

## 输入和输出

- 输入：通常为 `[B, C_in, H_in, W_in]`
- 输出：`[B, C_out, H_out, W_out]`
- 通道数：由 `in_channels` 和 `out_channels` 决定
- 高度和宽度：由 `kernel_size`、`stride`、`padding`、`dilation`、`output_padding` 决定

输出高度公式：

$$H_{out}=(H_{in}-1)\times s-2p+d\times(k-1)+o+1$$

宽度公式同理。其中 `s` 是步长，`p` 是填充，`d` 是空洞率，`k` 是卷积核大小，`o` 是 `output_padding`。

## 具体例子：2×2 上采样 4×4

设：

```text
H_in = W_in = 2
kernel_size = 3
stride = 1
padding = 0
dilation = 1
output_padding = 0
```

则：

```text
H_out = (2 - 1)×1 - 2×0 + 1×(3 - 1) + 0 + 1 = 4
```

所以输出空间尺寸是 `4×4`。原笔记中的示意图如下：

![[91-附件/Pasted image 20261112123020.png]]

## 最小 PyTorch 代码

```python
import torch
import torch.nn as nn

x = torch.randn(1, 1, 2, 2)
layer = nn.ConvTranspose2d(
    in_channels=1,
    out_channels=1,
    kernel_size=3,
    stride=1,
    padding=0,
)
y = layer(x)

print(x.shape)  # torch.Size([1, 1, 2, 2])
print(y.shape)  # torch.Size([1, 1, 4, 4])
```

## 为什么这样设计

1. 普通插值的放大规则是固定的，转置卷积的卷积核参数可以通过训练学习。
2. 在矩阵表示中，普通卷积可以写成 `y = Cx`；转置卷积对应 `C^T` 与输入相乘。
3. 它可以同时学习空间放大和特征变换，因此常用于解码器和分割网络。

## 原理推导

### 1. 普通卷积的矩阵形式

普通卷积可以改写成矩阵乘法。输入特征图展开成向量，卷积核和滑动位置组成矩阵 `C`，于是：

$$y=Cx$$

普通卷积计算示意：

![[91-附件/Pasted image 20261112130055.png]]

### 2. 转置矩阵

转置卷积使用 `C^T`：

$$x' = C^T y$$

对应的展开过程和辅助矩阵如下：

![[91-附件/Pasted image 20261112130130.png]]

![[91-附件/Pasted image 20261112130827.png]]

![[91-附件/Pasted image 20261112130907.png]]

### 3. 等效的空间计算

矩阵乘法可以拆成多个局部矩阵与输出位置的组合：

![[91-附件/Pasted image 20261112130956.png]]

![[91-附件/Pasted image 20261112131651.png]]

对于 `C^T`，矩阵乘法相当于使用它的列进行组合。每一列可以看作一个等效矩阵：

![[91-附件/Pasted image 20261112131918.png]]

这些等效矩阵和输出矩阵相乘后，得到与转置卷积相同的结果：

![[91-附件/Pasted image 20261112132132.png]]

![[91-附件/Pasted image 20261112132226.png]]

## 容易弄错的地方

- 转置卷积不是卷积的逆运算。
- “转置”指矩阵表示中的转置，不是把卷积核简单上下左右翻转就结束。
- 转置卷积不一定放大两倍，必须根据公式计算输出尺寸。
- `output_padding` 用于调整输出尺寸，不是额外的普通零填充。
- 使用 `stride > 1` 时可能出现棋盘格伪影，需要结合结构和上采样方式评估。

## 相关知识

- [[2. 上采样与下采样 UpSample DownSample]]
- [打开 U-Net 原文PDF（Zotero）](zotero://open-pdf/library/items/BRF76NBC)
## 参考资料

- [PyTorch ConvTranspose2d](https://pytorch.org/docs/stable/generated/torch.nn.ConvTranspose2d.html)
- [视频资料-【转置卷积（transposed convolution）】](https://www.bilibili.com/video/BV1mh411J7U4/?share_source=copy_web&vd_source=ed252459302a17b4b11f3eeb7d925a3d)

## 待解决的问题

- 对比转置卷积、双线性插值加普通卷积的参数量和伪影差异。






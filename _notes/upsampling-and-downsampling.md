---
tags:
  - DL
title: 上采样与下采样 UpSample DownSample
date: 2026-11-12
updated: 2026-11-16
publish: true
domain: 深度学习
featured: false
excerpt: 下采样减少特征图的高度和宽度，扩大感受野并降低计算量；上采样恢复空间尺寸，常用于解码器和像素级预测。
web_slug: upsampling-and-downsampling
web_id: upsampling-and-downsampling
rendered_body: rendered-notes/upsampling-and-downsampling.html
rendered_source_hash: b4b7150e6c20b15def0f7e24e4582df7335461257120f91eaac77a610612dbbf
mathjax: true
render_with_liquid: false
---


## 一句话理解

下采样减少特征图的高度和宽度，扩大感受野并降低计算量；上采样恢复空间尺寸，常用于解码器和像素级预测。

## 输入和输出

假设输入形状为 `[B, C, H, W]`：

- 下采样：通常变为 `[B, C或C', H/2, W/2]`
- 上采样：通常变为 `[B, C或C', 2H, 2W]`
- 是否改变通道数，要看后面是否接卷积；池化和插值本身一般不改通道数

## 下采样方法

### 最大池化

```python
pooled = F.max_pool2d(x, kernel_size=2)
```

当 `x.shape = [B, C, 256, 256]` 时，默认步长为 2：

```text
[B, C, 256, 256] → [B, C, 128, 128]
```

每个 `2×2` 区域取一个最大值。它没有可学习参数。

### 带步长的卷积

```python
layer = nn.Conv2d(C_in, C_out, kernel_size=3, stride=2, padding=1)
```

它同时可以改变通道数和空间尺寸，并且卷积核参数可以学习。

## 上采样方法

### 插值

```python
up = F.interpolate(
    x,
    scale_factor=2,
    mode="bilinear",
    align_corners=False,
)
```

插值没有可学习参数。也可以直接指定目标尺寸：

```python
up = F.interpolate(x, size=skip.shape[-2:], mode="bilinear", align_corners=False)
```

在 U-Net 中，指定为跳跃连接特征的尺寸，比写死放大倍数更稳妥。

### 转置卷积

```python
layer = nn.ConvTranspose2d(
    C_in, C_out, kernel_size=2, stride=2
)
```

它带可学习参数，既能改变空间尺寸，也能改变通道数。详见 [[1. 转置卷积 Transpose Conv]]。

## 一个网络中的尺寸例子

以 `256×256` 输入为例：

```text
下采样：256×256 → 128×128 → 64×64 → 32×32
上采样：32×32 → 64×64 → 128×128 → 256×256
```

在 SmokeNet 中：

```text
feature4 上采样到 feature3 的尺寸
与 feature3 沿 dim=1 拼接
再用卷积融合通道
```

## 容易弄错的地方

- `max_pool2d` 和 `interpolate` 通常只改变高、宽，不改变通道数。
- `torch.cat(..., dim=1)` 不是上采样；拼接前高、宽必须相同。
- 插值是固定规则，转置卷积的上采样过程可以学习。
- 输入尺寸为奇数时，连续池化可能出现不能简单除以 2 的情况，应检查实际 shape。

## 相关知识

- [[1. 转置卷积 Transpose Conv]]

## 参考资料

- [PyTorch interpolate](https://pytorch.org/docs/stable/generated/torch.nn.functional.interpolate.html)
- [PyTorch max_pool2d](https://pytorch.org/docs/stable/generated/torch.nn.functional.max_pool2d.html)





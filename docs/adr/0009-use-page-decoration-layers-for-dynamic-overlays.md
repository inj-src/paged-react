# Use Page Decoration Layers for Dynamic Overlays

Future page-varying overlays will use an additive `Document.PageDecoration` model with background and foreground layers, a render function receiving stable page metadata, and no effect on body pagination. The existing `Watermark` API will remain as a compatibility wrapper rather than becoming the general page-decoration contract, allowing the same decoration paint data to be emitted by HTML and PDF writers.

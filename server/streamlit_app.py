import io
import streamlit as st
from PIL import Image

from inference import run_inference

st.set_page_config(page_title="SwiftPOS Vision", layout="wide")

st.title("SwiftPOS Vision")
st.caption("YOLOv8n ONNX inference for POS item recognition.")

col1, col2 = st.columns([1.2, 1])

with col1:
    st.subheader("Capture or upload")
    uploaded = st.file_uploader("Upload an item image", type=["jpg", "jpeg", "png"])
    camera = st.camera_input("Capture from device camera")

    image_data = None
    if uploaded is not None:
        image_data = uploaded.getvalue()
    elif camera is not None:
        image_data = camera.getvalue()

    if image_data:
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        st.image(image, caption="Input frame", use_column_width=True)

        with st.spinner("Running inference..."):
            result = run_inference(image)
        st.success(f"Detected {len(result['detections'])} items")

with col2:
    st.subheader("Detections")
    if not image_data:
        st.info("Upload or capture an image to see detections.")
    else:
        for det in result["detections"]:
            st.write(
                f"{det['label']} - {det['confidence'] * 100:.1f}%"
            )
        st.metric("Latency (ms)", f"{result['inferenceMs']:.0f}")

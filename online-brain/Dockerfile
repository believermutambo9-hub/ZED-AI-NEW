FROM vllm/vllm-openai:v0.11.0

ENV HF_HOME=/models
EXPOSE 8000

ENTRYPOINT ["bash", "-lc", "exec vllm serve ${ZED_BRAIN_MODEL:-Qwen/Qwen3-8B-AWQ} --host 0.0.0.0 --port 8000 --api-key ${ZED_BRAIN_API_KEY:?ZED_BRAIN_API_KEY must be configured} --max-model-len ${ZED_BRAIN_MAX_MODEL_LEN:-16384} --gpu-memory-utilization ${ZED_BRAIN_GPU_MEMORY_UTILIZATION:-0.90} --max-num-seqs ${ZED_BRAIN_MAX_NUM_SEQS:-8}"]

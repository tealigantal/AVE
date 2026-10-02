FROM ghcr.io/speaches-ai/speaches@sha256:c0da392c37e76a01ba479239b43124c67baf8913ae0f491071d6ac544641dad7
COPY docker/start-whisper.py /opt/ave/start-whisper.py
CMD ["python", "/opt/ave/start-whisper.py"]

FROM python
COPY . .
RUN pip install -r requirements.txt
CMD ["uvicorn", "app.main:app"]
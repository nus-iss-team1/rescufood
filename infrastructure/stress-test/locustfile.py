from locust import HttpUser, task, between


class WebStressTest(HttpUser):
    """Load profile for the RescuFood platform web-service on ECS."""

    wait_time = between(0.1, 0.5)

    @task(5)
    def landing(self):
        self.client.get("/")

    @task(3)
    def signup(self):
        self.client.get("/signup")

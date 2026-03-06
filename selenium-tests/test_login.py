from selenium import webdriver
from selenium.webdriver.common.by import By
import time

def test_login():

    driver = webdriver.Chrome()
    driver.maximize_window()

    driver.get("https://practicetestautomation.com/practice-test-login/")

    username = driver.find_element(By.ID, "username")
    password = driver.find_element(By.ID, "password")
    submit = driver.find_element(By.ID, "submit")

    username.send_keys("student")
    password.send_keys("Password123")

    submit.click()

    time.sleep(3)

    assert "Logged In Successfully" in driver.page_source

    driver.quit()
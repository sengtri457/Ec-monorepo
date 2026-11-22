from setuptools import setup, find_packages

setup(
    name="ec-py-common",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "pyjwt>=2.8.0",
        "requests>=2.31.0",
    ],
)

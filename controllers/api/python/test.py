import argparse
import logging
import sys
from urllib.parse import urlparse, urljoin
import requests
import os
import json
import ovh
import argparse

# Instanciate an OVH Client.
# You can generate new credentials with full access to your account on
# the token creation page
client = ovh.Client(
    # Endpoint of API OVH Europe (List of available endpoints)
    endpoint='ovh-eu',
    application_key='a7a71aef0e7b53ca',    # Application Key
    application_secret='54b11c8aef0918e22c2fea40db9133b1',  # Application Secret
    consumer_key='b9902ea271ea0038cb61cac14b9c5da2',       # Consumer Key
)
cart = client.post("/order/cart", ovhSubsidiary="FR", _need_auth=False)
result = client.get('/me/contact')
print(len(result))
item = client.post(
    "/order/cart/{0}/domain".format(cart.get("cartId")), domain="test.art")
print(item["itemId"])  
print(cart["cartId"])    

# contact = client.post("/me/contact",
#                                                       firstName="mohamed",
#                                                       lastName="nahouchi",
#                                                       legalForm="trustable",
#                                                       address={
#                                                           "country": "FR",
#                                                           "line1": "bizer",
#                                                           "city": "rafraf",
#                                                           "zip": "7015"},
#                                                       language="fr_FR",
#                                                       email="mahouchiumoajdasd@gmail.com",
#                                                       phone="55910660")
#contactList = client.get('/me/contact')
#print(contactList)
#print(contactList[len(contactList) - 1])
## result = client.get('/me/contact/{}'.format(contactList[len(contactList) - 1]))
## print(item["prices"][0]["price"]["value"])
##
#configuration = client.post("/order/cart/{0}/item/{1}/configuration".format(cart["cartId"], item["itemId"]),
#                            label="ACKNOWLEDGE_PREMIUM_PRICE",
#                            value=item["prices"][0]["price"]["value"])
#configuration = client.post("/order/cart/{0}/item/{1}/configuration".format(cart["cartId"], item["itemId"]),
#                            label="OWNER_CONTACT",
#                            value="/me/contact/{0}".format(
#    23251739),
#)
#client.post(
#   "/order/cart/{0}/assign".format(cart.get("cartId")))
#salesorder = client.get(
#   "/order/cart/{0}/checkout".format(cart.get("cartId")))
#salesorder = client.post(
#   "/order/cart/{0}/checkout".format(cart.get("cartId")))
#print(salesorder["url"])

